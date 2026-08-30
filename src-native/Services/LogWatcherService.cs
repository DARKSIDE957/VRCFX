using System.IO;
using System.Text.RegularExpressions;
using VRCFX.Host.Models;

namespace VRCFX.Host.Services
{
    public class LogWatcherService : IDisposable
    {
        private readonly JsonStore _store;
        private readonly Action<RadarState> _onStateUpdate;
        private readonly Action<ActivityLogItem> _onActivityEvent;
        private readonly Action<OverlayNotificationPayload> _onNotification;

        private System.Threading.Timer? _pollTimer;
        private System.Threading.Timer? _rotationTimer;
        private string? _currentLogFile;
        private long _lastFilePosition = 0;
        private RadarState _radarState = new();
        private readonly object _lock = new();

        public LogWatcherService(
            JsonStore store,
            Action<RadarState> onStateUpdate,
            Action<ActivityLogItem> onActivityEvent,
            Action<OverlayNotificationPayload> onNotification)
        {
            _store = store;
            _onStateUpdate = onStateUpdate;
            _onActivityEvent = onActivityEvent;
            _onNotification = onNotification;
        }

        public void Start()
        {
            Stop();
            FindLatestLogFile();
            _radarState.IsWatching = true;
            _onStateUpdate?.Invoke(_radarState);

            // Read new lines every 3s — avoids contending with VRChat's log writes
            _pollTimer = new System.Threading.Timer(_ => ReadNewLogLines(), null, 3000, 3000);
            // Check for a newer log file every 45s (VRChat restart)
            _rotationTimer = new System.Threading.Timer(_ => FindLatestLogFile(), null, 45_000, 45_000);
        }

        public void Stop()
        {
            _pollTimer?.Dispose();
            _pollTimer = null;
            _rotationTimer?.Dispose();
            _rotationTimer = null;
            _radarState.IsWatching = false;
            _onStateUpdate?.Invoke(_radarState);
        }

        public RadarState GetState()
        {
            lock (_lock)
            {
                return _radarState;
            }
        }

        private string GetVrcLogDirectory()
        {
            var userPath = _store.GetSettings().VrcLogPath;
            if (!string.IsNullOrWhiteSpace(userPath) && Directory.Exists(userPath))
            {
                return userPath;
            }

            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var parent = Directory.GetParent(appData)?.FullName;
            if (parent != null)
            {
                var defaultPath = Path.Combine(parent, "LocalLow", "VRChat", "VRChat");
                if (Directory.Exists(defaultPath)) return defaultPath;
            }

            return Path.Combine(appData, "VRChat");
        }

        private void FindLatestLogFile()
        {
            try
            {
                var dir = GetVrcLogDirectory();
                if (!Directory.Exists(dir)) return;

                var files = Directory.GetFiles(dir, "output_log_*.txt")
                    .Select(f => new FileInfo(f))
                    .OrderByDescending(f => f.LastWriteTimeUtc)
                    .ToList();

                var latest = files.FirstOrDefault();
                if (latest != null && latest.FullName != _currentLogFile)
                {
                    _currentLogFile = latest.FullName;
                    _lastFilePosition = 0; // Read from beginning of new session
                    _radarState.ActiveLogFile = latest.Name;
                    _radarState.Players.Clear();
                    _radarState.LogEvents.Clear();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LogWatcher] FindLatestLogFile error: {ex.Message}");
            }
        }

        private void ReadNewLogLines()
        {
            lock (_lock)
            {
                try
                {
                    if (string.IsNullOrEmpty(_currentLogFile) || !File.Exists(_currentLogFile)) return;

                    using var fs = new FileStream(_currentLogFile, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    if (fs.Length < _lastFilePosition)
                    {
                        _lastFilePosition = 0; // File was truncated/recreated
                    }

                    if (fs.Length == _lastFilePosition) return;

                    fs.Seek(_lastFilePosition, SeekOrigin.Begin);
                    using var reader = new StreamReader(fs);
                    string? line;
                    bool stateChanged = false;

                    while ((line = reader.ReadLine()) != null)
                    {
                        if (ProcessLogLine(line))
                        {
                            stateChanged = true;
                        }
                    }

                    _lastFilePosition = fs.Position;

                    if (stateChanged)
                    {
                        _onStateUpdate?.Invoke(_radarState);
                    }
                }
                catch
                {
                    // Ignore transient file lock collisions from VRChat engine writes
                }
            }
        }

        private bool ProcessLogLine(string line)
        {
            if (string.IsNullOrWhiteSpace(line)) return false;

            var timeMatch = Regex.Match(line, @"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})");
            var timestamp = timeMatch.Success ? timeMatch.Groups[1].Value : DateTime.Now.ToString("HH:mm:ss");

            // 1. Room Entering / World Name
            var roomMatch = Regex.Match(line, @"\[Behaviour\] Entering Room: (.+)$");
            if (roomMatch.Success)
            {
                var worldName = roomMatch.Groups[1].Value.Trim();
                _radarState.CurrentWorldName = worldName;
                _radarState.JoinedWorldAt = timestamp;
                _radarState.Players.Clear();

                _radarState.LogEvents.Insert(0, new RadarLogEvent
                {
                    Type = "world_join",
                    Message = $"Entered world: {worldName}",
                    Timestamp = timestamp
                });

                _store.RecordVisitedInstance(new VisitedInstance
                {
                    WorldId = _radarState.CurrentWorldId,
                    WorldName = worldName,
                    InstanceId = _radarState.CurrentInstanceId,
                    InstanceType = _radarState.InstanceType,
                    VisitedAt = DateTime.UtcNow.ToString("o")
                });

                return true;
            }

            // 2. Room ID / Instance ID
            var joinMatch = Regex.Match(line, @"\[Behaviour\] Joining (wrld_[a-f0-9\-]+):?([a-zA-Z0-9~()_\-]+)?");
            if (joinMatch.Success)
            {
                _radarState.CurrentWorldId = joinMatch.Groups[1].Value;
                _radarState.CurrentInstanceId = joinMatch.Groups[2].Value;
                _radarState.InstanceType = DeriveInstanceType(_radarState.CurrentInstanceId);
                return true;
            }

            // 3. Player Joined
            var playerJoinedMatch = Regex.Match(line, @"\[Behaviour\] OnPlayerJoined ([^(\r\n]+)");
            if (playerJoinedMatch.Success)
            {
                var name = playerJoinedMatch.Groups[1].Value.Trim();
                if (!_radarState.Players.Any(p => p.DisplayName.Equals(name, StringComparison.OrdinalIgnoreCase)))
                {
                    var isFriend = _store.GetCachedFriends().Any(f => f.DisplayName.Equals(name, StringComparison.OrdinalIgnoreCase));
                    _radarState.Players.Add(new RadarPlayer
                    {
                        DisplayName = name,
                        JoinedAt = timestamp,
                        IsFriend = isFriend
                    });

                    _radarState.LogEvents.Insert(0, new RadarLogEvent
                    {
                        Type = "player_join",
                        Message = $"{name} joined instance",
                        Timestamp = timestamp
                    });

                    if (_radarState.LogEvents.Count > 100)
                    {
                        _radarState.LogEvents = _radarState.LogEvents.Take(100).ToList();
                    }

                    return true;
                }
            }

            // 4. Player Left
            var playerLeftMatch = Regex.Match(line, @"\[Behaviour\] OnPlayerLeft ([^(\r\n]+)");
            if (playerLeftMatch.Success)
            {
                var name = playerLeftMatch.Groups[1].Value.Trim();
                var existing = _radarState.Players.FirstOrDefault(p => p.DisplayName.Equals(name, StringComparison.OrdinalIgnoreCase));
                if (existing != null)
                {
                    _radarState.Players.Remove(existing);
                    _radarState.LogEvents.Insert(0, new RadarLogEvent
                    {
                        Type = "player_leave",
                        Message = $"{name} left instance",
                        Timestamp = timestamp
                    });

                    if (_radarState.LogEvents.Count > 100)
                    {
                        _radarState.LogEvents = _radarState.LogEvents.Take(100).ToList();
                    }

                    return true;
                }
            }

            return false;
        }

        private static string DeriveInstanceType(string? instanceId)
        {
            if (string.IsNullOrEmpty(instanceId)) return "Public";
            if (instanceId.Contains("private", StringComparison.OrdinalIgnoreCase)) return "Invite+";
            if (instanceId.Contains("friends", StringComparison.OrdinalIgnoreCase)) return "Friends+";
            if (instanceId.Contains("hidden", StringComparison.OrdinalIgnoreCase)) return "Friends";
            if (instanceId.Contains("group", StringComparison.OrdinalIgnoreCase)) return "Group";
            return "Public";
        }

        public void Dispose()
        {
            Stop();
        }
    }
}
