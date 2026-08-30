using System.Text.Json.Serialization;

namespace VRCFX.Host.Models
{
    public class AppSettings
    {
        [JsonPropertyName("vrcLogPath")]
        public string VrcLogPath { get; set; } = "";

        [JsonPropertyName("autoRefreshFriends")]
        public bool AutoRefreshFriends { get; set; } = false;

        [JsonPropertyName("refreshIntervalMinutes")]
        public int RefreshIntervalMinutes { get; set; } = 15;

        [JsonPropertyName("theme")]
        public string Theme { get; set; } = "pitch-black";

        [JsonPropertyName("language")]
        public string Language { get; set; } = "en";

        [JsonPropertyName("hasCompletedOnboarding")]
        public bool HasCompletedOnboarding { get; set; } = false;

        [JsonPropertyName("soundAlerts")]
        public bool SoundAlerts { get; set; } = true;

        [JsonPropertyName("soundVolume")]
        public int SoundVolume { get; set; } = 75;

        [JsonPropertyName("soundChimeType")]
        public string SoundChimeType { get; set; } = "harmonic";

        [JsonPropertyName("enableLogWatcher")]
        public bool EnableLogWatcher { get; set; } = true;

        [JsonPropertyName("notificationPosition")]
        public string NotificationPosition { get; set; } = "bottom-right";

        [JsonPropertyName("startWithWindows")]
        public bool StartWithWindows { get; set; } = false;

        [JsonPropertyName("minimizeToTray")]
        public bool MinimizeToTray { get; set; } = true;

        [JsonPropertyName("desktopOverlayNotifications")]
        public bool DesktopOverlayNotifications { get; set; } = true;

        [JsonPropertyName("notifyFriendOnline")]
        public bool NotifyFriendOnline { get; set; } = true;

        [JsonPropertyName("notifyFriendOnlineDesktop")]
        public bool NotifyFriendOnlineDesktop { get; set; } = true;

        [JsonPropertyName("notifyFriendOffline")]
        public bool NotifyFriendOffline { get; set; } = false;

        [JsonPropertyName("notifyFriendWorld")]
        public bool NotifyFriendWorld { get; set; } = true;

        [JsonPropertyName("notifyFriendWorldDesktop")]
        public bool NotifyFriendWorldDesktop { get; set; } = true;

        [JsonPropertyName("notifyUnfriended")]
        public bool NotifyUnfriended { get; set; } = true;

        [JsonPropertyName("notifyUnfriendedDesktop")]
        public bool NotifyUnfriendedDesktop { get; set; } = true;

        [JsonPropertyName("notifyNameChange")]
        public bool NotifyNameChange { get; set; } = true;

        [JsonPropertyName("notifyNameChangeDesktop")]
        public bool NotifyNameChangeDesktop { get; set; } = true;

        [JsonPropertyName("notifyFriendAdded")]
        public bool NotifyFriendAdded { get; set; } = true;
    }

    public class VRCUser
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("username")]
        public string Username { get; set; } = "";

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = "";

        [JsonPropertyName("userIcon")]
        public string? UserIcon { get; set; }

        [JsonPropertyName("profilePicOverride")]
        public string? ProfilePicOverride { get; set; }

        [JsonPropertyName("currentAvatarImageUrl")]
        public string? CurrentAvatarImageUrl { get; set; }

        [JsonPropertyName("currentAvatarThumbnailImageUrl")]
        public string? CurrentAvatarThumbnailImageUrl { get; set; }

        [JsonPropertyName("currentAvatarId")]
        public string? CurrentAvatarId { get; set; }

        [JsonPropertyName("currentAvatarTags")]
        public string[]? CurrentAvatarTags { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "offline";

        [JsonPropertyName("statusDescription")]
        public string StatusDescription { get; set; } = "";

        [JsonPropertyName("state")]
        public string State { get; set; } = "offline";

        [JsonPropertyName("tags")]
        public string[]? Tags { get; set; }

        [JsonPropertyName("developerType")]
        public string? DeveloperType { get; set; }

        [JsonPropertyName("last_login")]
        public string? LastLogin { get; set; }

        [JsonPropertyName("last_platform")]
        public string? LastPlatform { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }

        [JsonPropertyName("worldId")]
        public string? WorldId { get; set; }

        [JsonPropertyName("instanceId")]
        public string? InstanceId { get; set; }

        [JsonPropertyName("friendKey")]
        public string? FriendKey { get; set; }

        [JsonPropertyName("bio")]
        public string? Bio { get; set; }

        [JsonPropertyName("bioLinks")]
        public string[]? BioLinks { get; set; }

        [JsonPropertyName("isFriend")]
        public bool? IsFriend { get; set; }

        [JsonPropertyName("trustRank")]
        public string? TrustRank { get; set; }

        [JsonPropertyName("hasVRCPlus")]
        public bool? HasVRCPlus { get; set; }

        [JsonPropertyName("isFavorite")]
        public bool? IsFavorite { get; set; }

        [JsonPropertyName("favoriteGroup")]
        public string? FavoriteGroup { get; set; }

        [JsonPropertyName("nickname")]
        public string? Nickname { get; set; }

        [JsonPropertyName("customNote")]
        public string? CustomNote { get; set; }

        [JsonPropertyName("pastDisplayNames")]
        public PastDisplayName[]? PastDisplayNames { get; set; }
    }

    public class PastDisplayName
    {
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = "";

        [JsonPropertyName("updatedAt")]
        public string? UpdatedAt { get; set; }
    }

    public class FriendNote
    {
        [JsonPropertyName("nickname")]
        public string? Nickname { get; set; }

        [JsonPropertyName("note")]
        public string? Note { get; set; }

        [JsonPropertyName("updatedAt")]
        public string? UpdatedAt { get; set; }
    }

    public class ActivityLogItem
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        [JsonPropertyName("message")]
        public string Message { get; set; } = "";

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = "";

        [JsonPropertyName("userId")]
        public string? UserId { get; set; }

        [JsonPropertyName("avatarUrl")]
        public string? AvatarUrl { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }

        [JsonPropertyName("oldValue")]
        public string? OldValue { get; set; }

        [JsonPropertyName("newValue")]
        public string? NewValue { get; set; }

        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = "";

        [JsonPropertyName("isoTimestamp")]
        public string IsoTimestamp { get; set; } = "";
    }

    public class VisitedInstance
    {
        [JsonPropertyName("worldId")]
        public string WorldId { get; set; } = "";

        [JsonPropertyName("worldName")]
        public string WorldName { get; set; } = "";

        [JsonPropertyName("instanceId")]
        public string InstanceId { get; set; } = "";

        [JsonPropertyName("instanceType")]
        public string InstanceType { get; set; } = "";

        [JsonPropertyName("visitedAt")]
        public string VisitedAt { get; set; } = "";

        [JsonPropertyName("playerCount")]
        public int? PlayerCount { get; set; }
    }

    public class RadarPlayer
    {
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = "";

        [JsonPropertyName("userId")]
        public string? UserId { get; set; }

        [JsonPropertyName("joinedAt")]
        public string JoinedAt { get; set; } = "";

        [JsonPropertyName("isFriend")]
        public bool? IsFriend { get; set; }

        [JsonPropertyName("ping")]
        public int? Ping { get; set; }

        [JsonPropertyName("fps")]
        public int? Fps { get; set; }
    }

    public class RadarLogEvent
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("message")]
        public string Message { get; set; } = "";

        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = "";
    }

    public class RadarState
    {
        [JsonPropertyName("currentWorldName")]
        public string CurrentWorldName { get; set; } = "Waiting for VRChat...";

        [JsonPropertyName("currentWorldId")]
        public string CurrentWorldId { get; set; } = "";

        [JsonPropertyName("currentInstanceId")]
        public string CurrentInstanceId { get; set; } = "";

        [JsonPropertyName("instanceType")]
        public string InstanceType { get; set; } = "Public";

        [JsonPropertyName("joinedWorldAt")]
        public string JoinedWorldAt { get; set; } = "";

        [JsonPropertyName("players")]
        public List<RadarPlayer> Players { get; set; } = new();

        [JsonPropertyName("logEvents")]
        public List<RadarLogEvent> LogEvents { get; set; } = new();

        [JsonPropertyName("isWatching")]
        public bool IsWatching { get; set; } = false;

        [JsonPropertyName("activeLogFile")]
        public string ActiveLogFile { get; set; } = "";
    }

    public class OverlayNotificationPayload
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        [JsonPropertyName("message")]
        public string Message { get; set; } = "";

        [JsonPropertyName("isFriend")]
        public bool? IsFriend { get; set; }

        [JsonPropertyName("location")]
        public string? Location { get; set; }

        [JsonPropertyName("avatarUrl")]
        public string? AvatarUrl { get; set; }

        [JsonPropertyName("accentType")]
        public string? AccentType { get; set; } = "default";
    }

    public class IpcMessage
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("channel")]
        public string Channel { get; set; } = "";

        [JsonPropertyName("data")]
        public object? Data { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }
}
