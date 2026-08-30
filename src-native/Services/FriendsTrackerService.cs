using VRCFX.Host.Models;

namespace VRCFX.Host.Services
{
    public class FriendsTrackerService : IDisposable
    {
        private readonly VRChatApiService _api;
        private readonly JsonStore _store;
        private readonly Action<ActivityLogItem> _onActivityEvent;
        private readonly Action<object> _onToastNotification;
        private readonly Action<OverlayNotificationPayload> _onDesktopOverlay;

        private System.Threading.Timer? _fastPollTimer;
        private System.Threading.Timer? _fullScanTimer;
        private bool _isFirstRun = true;
        private Dictionary<string, VRCUser> _lastOnlineSnapshot = new();
        private Dictionary<string, VRCUser> _lastFullSnapshot = new();

        public FriendsTrackerService(
            VRChatApiService api,
            JsonStore store,
            Action<ActivityLogItem> onActivityEvent,
            Action<object> onToastNotification,
            Action<OverlayNotificationPayload> onDesktopOverlay)
        {
            _api = api;
            _store = store;
            _onActivityEvent = onActivityEvent;
            _onToastNotification = onToastNotification;
            _onDesktopOverlay = onDesktopOverlay;
        }

        public void Start()
        {
            Stop();

            if (!_api.HasSavedSession()) return;

            // Defer heavy full sync so VRChat launch isn't competing with API traffic
            _ = Task.Run(async () =>
            {
                await Task.Delay(60_000);
                await CheckFullFriendsAsync();
            });

            _fastPollTimer = new System.Threading.Timer(_ => _ = CheckOnlineFriendsAsync(), null, 45_000, 45_000);
            _fullScanTimer = new System.Threading.Timer(_ => _ = CheckFullFriendsAsync(), null, 600_000, 600_000);
        }

        public void Stop()
        {
            _fastPollTimer?.Dispose();
            _fastPollTimer = null;
            _fullScanTimer?.Dispose();
            _fullScanTimer = null;
        }

        public async Task CheckOnlineFriendsAsync()
        {
            if (!_api.HasSavedSession()) return;
            try
            {
                var onlineFriends = await _api.GetOnlineFriendsAsync();
                var currentOnlineMap = onlineFriends.ToDictionary(f => f.Id, f => f);

                var settings = _store.GetSettings();
                var knownFriends = _store.GetKnownFriends();

                if (_lastOnlineSnapshot.Count == 0)
                {
                    _lastOnlineSnapshot = currentOnlineMap;
                    return;
                }

                // Check for friends newly online or world changes
                foreach (var (id, currentFriend) in currentOnlineMap)
                {
                    _lastOnlineSnapshot.TryGetValue(id, out var prevFriend);
                    var avatarUrl = currentFriend.CurrentAvatarThumbnailImageUrl ?? currentFriend.UserIcon ?? currentFriend.CurrentAvatarImageUrl ?? "";

                    // Newly online
                    if (prevFriend == null)
                    {
                        var log = _store.AddActivityLog(new ActivityLogItem
                        {
                            Type = "online",
                            Title = "Friend Joined Game",
                            Message = $"{currentFriend.DisplayName} launched VRChat / came online",
                            DisplayName = currentFriend.DisplayName,
                            UserId = currentFriend.Id,
                            AvatarUrl = avatarUrl,
                            Location = currentFriend.Location
                        });
                        _onActivityEvent?.Invoke(log);

                        if (settings.NotifyFriendOnline)
                        {
                            _onToastNotification?.Invoke(new
                            {
                                type = "friend_online",
                                title = "Friend Launched VRChat",
                                message = $"{currentFriend.DisplayName} is now active in VRChat",
                                displayName = currentFriend.DisplayName,
                                userId = currentFriend.Id,
                                isFriend = true,
                                location = currentFriend.Location,
                                avatarUrl
                            });
                        }

                        if (settings.NotifyFriendOnlineDesktop)
                        {
                            _onDesktopOverlay?.Invoke(new OverlayNotificationPayload
                            {
                                Title = "Friend Joined Game",
                                Message = $"{currentFriend.DisplayName} is now online",
                                IsFriend = true,
                                Location = currentFriend.Location,
                                AvatarUrl = avatarUrl,
                                AccentType = "online"
                            });
                        }
                    }
                    // World changed
                    else if (!string.IsNullOrEmpty(currentFriend.Location) &&
                             currentFriend.Location != "offline" &&
                             currentFriend.Location != prevFriend.Location)
                    {
                        var log = _store.AddActivityLog(new ActivityLogItem
                        {
                            Type = "world_change",
                            Title = "Friend Changed World",
                            Message = $"{currentFriend.DisplayName} traveled to a new instance",
                            DisplayName = currentFriend.DisplayName,
                            UserId = currentFriend.Id,
                            AvatarUrl = avatarUrl,
                            Location = currentFriend.Location
                        });
                        _onActivityEvent?.Invoke(log);

                        if (settings.NotifyFriendWorld)
                        {
                            _onToastNotification?.Invoke(new
                            {
                                type = "world_change",
                                title = "Friend Changed World",
                                message = $"{currentFriend.DisplayName} joined a new room",
                                displayName = currentFriend.DisplayName,
                                userId = currentFriend.Id,
                                isFriend = true,
                                location = currentFriend.Location,
                                avatarUrl
                            });
                        }

                        if (settings.NotifyFriendWorldDesktop)
                        {
                            _onDesktopOverlay?.Invoke(new OverlayNotificationPayload
                            {
                                Title = "Friend Changed World",
                                Message = $"{currentFriend.DisplayName} traveled to a new instance",
                                IsFriend = true,
                                Location = currentFriend.Location,
                                AvatarUrl = avatarUrl,
                                AccentType = "world"
                            });
                        }
                    }

                    // Check Display Name changes
                    if (knownFriends.TryGetValue(id, out var knownRecord) &&
                        !string.IsNullOrEmpty(knownRecord.DisplayName) &&
                        knownRecord.DisplayName != currentFriend.DisplayName)
                    {
                        var oldName = knownRecord.DisplayName;
                        var newName = currentFriend.DisplayName;
                        _store.RecordDisplayName(id, newName);

                        var log = _store.AddActivityLog(new ActivityLogItem
                        {
                            Type = "name_change",
                            Title = "Display Name Changed",
                            Message = $"{oldName} changed their name to {newName}",
                            DisplayName = newName,
                            OldValue = oldName,
                            NewValue = newName,
                            UserId = currentFriend.Id,
                            AvatarUrl = avatarUrl
                        });
                        _onActivityEvent?.Invoke(log);

                        if (settings.NotifyNameChange)
                        {
                            _onToastNotification?.Invoke(new
                            {
                                type = "name_change",
                                title = "Name Change Detected",
                                message = $"{oldName} is now known as ${newName}",
                                displayName = newName,
                                userId = currentFriend.Id,
                                isFriend = true,
                                avatarUrl
                            });
                        }

                        if (settings.NotifyNameChangeDesktop)
                        {
                            _onDesktopOverlay?.Invoke(new OverlayNotificationPayload
                            {
                                Title = "Name Change Detected",
                                Message = $"{oldName} ➔ {newName}",
                                IsFriend = true,
                                AvatarUrl = avatarUrl,
                                AccentType = "name_change"
                            });
                        }
                    }
                }

                // Check friends who went offline
                foreach (var (id, prevFriend) in _lastOnlineSnapshot)
                {
                    if (!currentOnlineMap.ContainsKey(id))
                    {
                        var log = _store.AddActivityLog(new ActivityLogItem
                        {
                            Type = "offline",
                            Title = "Friend Left Game",
                            Message = $"{prevFriend.DisplayName} logged off / went offline",
                            DisplayName = prevFriend.DisplayName,
                            UserId = prevFriend.Id,
                            AvatarUrl = prevFriend.UserIcon ?? prevFriend.CurrentAvatarThumbnailImageUrl ?? ""
                        });
                        _onActivityEvent?.Invoke(log);
                    }
                }

                _lastOnlineSnapshot = currentOnlineMap;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FriendsTracker] CheckOnlineFriends error: {ex.Message}");
            }
        }

        public async Task CheckFullFriendsAsync(bool forceManual = false)
        {
            if (!_api.HasSavedSession()) return;
            try
            {
                var (online, offline) = await _api.GetFriendsAsync(true);
                var allFriends = online.Concat(offline).ToList();
                if (allFriends.Count == 0 && !forceManual) return;

                var currentFriendsMap = allFriends.ToDictionary(f => f.Id, f => f);
                var knownFriends = _store.GetKnownFriends();
                var settings = _store.GetSettings();

                if (_isFirstRun || _lastFullSnapshot.Count == 0)
                {
                    _lastFullSnapshot = currentFriendsMap;
                    var updatedKnown = new Dictionary<string, KnownFriendRecord>(knownFriends);
                    foreach (var f in allFriends)
                    {
                        updatedKnown[f.Id] = new KnownFriendRecord
                        {
                            DisplayName = f.DisplayName,
                            AvatarUrl = f.CurrentAvatarThumbnailImageUrl ?? f.UserIcon ?? f.CurrentAvatarImageUrl ?? "",
                            LastSeen = DateTime.UtcNow.ToString("o")
                        };
                    }
                    _store.SaveKnownFriends(updatedKnown);
                    _isFirstRun = false;
                    return;
                }

                // Anti-drop safeguard: If friend count dropped by >15%, skip unfriend checks to avoid false alarms
                var previousTotal = _lastFullSnapshot.Count;
                var currentTotal = currentFriendsMap.Count;
                var isDropAnomalous = previousTotal > 10 && currentTotal < previousTotal * 0.85;

                if (!isDropAnomalous)
                {
                    foreach (var (id, prevFriend) in _lastFullSnapshot)
                    {
                        if (!currentFriendsMap.ContainsKey(id))
                        {
                            // Verify directly with user profile
                            try
                            {
                                var profile = await _api.GetUserProfileAsync(id);
                                if (profile != null && profile.IsFriend == false)
                                {
                                    var displayName = knownFriends.TryGetValue(id, out var k) ? k.DisplayName : prevFriend.DisplayName;
                                    var avatarUrl = knownFriends.TryGetValue(id, out var k2) ? k2.AvatarUrl : (prevFriend.CurrentAvatarThumbnailImageUrl ?? "");

                                    var log = _store.AddActivityLog(new ActivityLogItem
                                    {
                                        Type = "unfriended",
                                        Title = "Unfriended / Removed",
                                        Message = $"{displayName} is no longer on your friends list",
                                        DisplayName = displayName,
                                        UserId = id,
                                        AvatarUrl = avatarUrl
                                    });
                                    _onActivityEvent?.Invoke(log);

                                    if (settings.NotifyUnfriended)
                                    {
                                        _onToastNotification?.Invoke(new
                                        {
                                            type = "unfriended",
                                            title = "Friendship Removed",
                                            message = $"{displayName} unfriended or was removed",
                                            displayName,
                                            userId = id,
                                            isFriend = false,
                                            avatarUrl
                                        });
                                    }

                                    if (settings.NotifyUnfriendedDesktop)
                                    {
                                        _onDesktopOverlay?.Invoke(new OverlayNotificationPayload
                                        {
                                            Title = "Friendship Removed",
                                            Message = $"{displayName} is no longer on your friends list",
                                            IsFriend = false,
                                            AvatarUrl = avatarUrl,
                                            AccentType = "unfriended"
                                        });
                                    }

                                    knownFriends.Remove(id);
                                }
                            }
                            catch { }
                        }
                    }
                }

                foreach (var f in allFriends)
                {
                    knownFriends[f.Id] = new KnownFriendRecord
                    {
                        DisplayName = f.DisplayName,
                        AvatarUrl = f.CurrentAvatarThumbnailImageUrl ?? f.UserIcon ?? f.CurrentAvatarImageUrl ?? "",
                        LastSeen = DateTime.UtcNow.ToString("o")
                    };
                }
                _store.SaveKnownFriends(knownFriends);
                _lastFullSnapshot = currentFriendsMap;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FriendsTracker] CheckFullFriends error: {ex.Message}");
            }
        }

        public void Dispose()
        {
            Stop();
        }
    }
}
