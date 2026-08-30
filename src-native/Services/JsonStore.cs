using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using VRCFX.Host.Models;

namespace VRCFX.Host.Services
{
    public class KnownFriendRecord
    {
        public string DisplayName { get; set; } = "";
        public string AvatarUrl { get; set; } = "";
        public string LastSeen { get; set; } = "";
    }

    public class JsonStore
    {
        private readonly string _filePath;
        private JsonObject _data;
        private readonly object _lock = new();
        private System.Threading.Timer? _saveDebounceTimer;
        private bool _savePending;

        public JsonStore()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var folder = Path.Combine(appData, "VRCFX");
            Directory.CreateDirectory(folder);
            _filePath = Path.Combine(folder, "vrcfx-data.json");
            _data = new JsonObject();
            Load();
        }

        private void Load()
        {
            lock (_lock)
            {
                try
                {
                    if (File.Exists(_filePath))
                    {
                        var json = File.ReadAllText(_filePath);
                        var node = JsonNode.Parse(json);
                        _data = node as JsonObject ?? new JsonObject();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[JsonStore] Error reading file: {ex.Message}");
                    _data = new JsonObject();
                }

                if (!_data.ContainsKey("settings"))
                {
                    _data["settings"] = JsonSerializer.SerializeToNode(new AppSettings());
                    Save(immediate: true);
                }
            }
        }

        public void Save(bool immediate = false)
        {
            lock (_lock)
            {
                _savePending = true;
                if (immediate)
                {
                    _saveDebounceTimer?.Dispose();
                    _saveDebounceTimer = null;
                    FlushSave();
                    return;
                }

                _saveDebounceTimer ??= new System.Threading.Timer(_ => FlushSave(), null, Timeout.Infinite, Timeout.Infinite);
                _saveDebounceTimer.Change(2500, Timeout.Infinite);
            }
        }

        public void FlushPendingSave() => Save(immediate: true);

        private void FlushSave()
        {
            lock (_lock)
            {
                if (!_savePending) return;
                _savePending = false;

                try
                {
                    var options = new JsonSerializerOptions { WriteIndented = true };
                    var json = _data.ToJsonString(options);
                    File.WriteAllText(_filePath, json);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[JsonStore] Error saving file: {ex.Message}");
                }
            }
        }

        public T Get<T>(string key, T defaultValue)
        {
            lock (_lock)
            {
                if (_data.TryGetPropertyValue(key, out var node) && node != null)
                {
                    try
                    {
                        var val = node.Deserialize<T>();
                        return val ?? defaultValue;
                    }
                    catch
                    {
                        return defaultValue;
                    }
                }
                return defaultValue;
            }
        }

        public void Set<T>(string key, T value)
        {
            lock (_lock)
            {
                _data[key] = JsonSerializer.SerializeToNode(value);
                Save();
            }
        }

        // Specific Typed Helpers
        public AppSettings GetSettings() => Get("settings", new AppSettings());

        public void SaveSettings(AppSettings settings) => Set("settings", settings);

        public Dictionary<string, string> GetCookies() => Get("cookies", new Dictionary<string, string>());

        public void SetCookies(Dictionary<string, string> cookies) => Set("cookies", cookies);

        public VRCUser? GetLastUser() => Get<VRCUser?>("lastUser", null);

        public void SetLastUser(VRCUser? user) => Set("lastUser", user);

        public List<VRCUser> GetCachedFriends() => Get("cachedFriends", new List<VRCUser>());

        public void SetCachedFriends(List<VRCUser> friends) => Set("cachedFriends", friends);

        public Dictionary<string, KnownFriendRecord> GetKnownFriends() => Get("knownFriends", new Dictionary<string, KnownFriendRecord>());

        public void SaveKnownFriends(Dictionary<string, KnownFriendRecord> friends) => Set("knownFriends", friends);

        public Dictionary<string, FriendNote> GetFriendNotes() => Get("friendNotes", new Dictionary<string, FriendNote>());

        public void SaveFriendNote(string userId, string? nickname, string? note)
        {
            var notes = GetFriendNotes();
            notes[userId] = new FriendNote
            {
                Nickname = nickname,
                Note = note,
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };
            Set("friendNotes", notes);
        }

        public Dictionary<string, List<PastDisplayName>> GetNameHistory() => Get("nameHistory", new Dictionary<string, List<PastDisplayName>>());

        public void RecordDisplayName(string userId, string displayName)
        {
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(displayName)) return;
            var history = GetNameHistory();
            if (!history.TryGetValue(userId, out var list))
            {
                list = new List<PastDisplayName>();
                history[userId] = list;
            }

            var last = list.LastOrDefault();
            if (last == null || last.DisplayName != displayName)
            {
                list.Add(new PastDisplayName
                {
                    DisplayName = displayName,
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                });
                Set("nameHistory", history);
            }
        }

        public List<VisitedInstance> GetVisitedInstances() => Get("visitedInstances", new List<VisitedInstance>());

        public void RecordVisitedInstance(VisitedInstance instance)
        {
            if (string.IsNullOrWhiteSpace(instance.WorldId) && string.IsNullOrWhiteSpace(instance.WorldName)) return;
            var list = GetVisitedInstances();
            var last = list.FirstOrDefault();
            if (last != null && last.WorldId == instance.WorldId && last.InstanceId == instance.InstanceId)
            {
                last.PlayerCount = instance.PlayerCount ?? last.PlayerCount;
                Set("visitedInstances", list);
                return;
            }
            list.Insert(0, instance);
            if (list.Count > 100) list = list.Take(100).ToList();
            Set("visitedInstances", list);
        }

        public void ClearVisitedInstances() => Set("visitedInstances", new List<VisitedInstance>());

        public List<ActivityLogItem> GetActivityLogs() => Get("activityLogs", new List<ActivityLogItem>());

        public ActivityLogItem AddActivityLog(ActivityLogItem item)
        {
            var logs = GetActivityLogs();
            var now = DateTime.Now;
            item.Id = $"act_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..5]}";
            item.Timestamp = now.ToString("hh:mm:ss tt");
            item.IsoTimestamp = DateTime.UtcNow.ToString("o");

            logs.Insert(0, item);
            if (logs.Count > 250) logs = logs.Take(250).ToList();
            Set("activityLogs", logs);
            return item;
        }

        public void ClearActivityLogs() => Set("activityLogs", new List<ActivityLogItem>());
    }
}
