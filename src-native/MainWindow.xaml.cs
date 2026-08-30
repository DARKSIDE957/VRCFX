using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using Forms = System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using VRCFX.Host.Models;
using VRCFX.Host.Services;

namespace VRCFX.Host
{
    public partial class MainWindow : Window
    {
        private readonly JsonStore _store;
        private readonly VRChatApiService _api;
        private readonly OscService _osc;
        private readonly LogWatcherService _logWatcher;
        private readonly FriendsTrackerService _friendsTracker;
        private readonly OverlayNotificationManager _overlayManager;
        private EmbeddedWebServer? _webServer;

        private bool _isForceQuit = false;

        public MainWindow()
        {
            InitializeComponent();

            _store = new JsonStore();
            _api = new VRChatApiService(_store);
            _osc = new OscService();
            _overlayManager = new OverlayNotificationManager(_store);

            _logWatcher = new LogWatcherService(
                _store,
                onStateUpdate: (state) => SendWebEvent("radar:update", state),
                onActivityEvent: (act) => SendWebEvent("activity:newEvent", act),
                onNotification: (notif) => _overlayManager.Show(notif)
            );

            _friendsTracker = new FriendsTrackerService(
                _api,
                _store,
                onActivityEvent: (act) => SendWebEvent("activity:newEvent", act),
                onToastNotification: (toast) => SendWebEvent("notification:toast", toast),
                onDesktopOverlay: (overlay) => _overlayManager.Show(overlay)
            );

            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            Show();
            WindowState = WindowState.Normal;
            Activate();
            Focus();

            await InitializeWebViewAsync();

            var settings = _store.GetSettings();
            if (settings.EnableLogWatcher)
            {
                _logWatcher.Start();
            }

            if (_api.HasSavedSession())
            {
                _friendsTracker.Start();
            }
        }

        private async Task InitializeWebViewAsync()
        {
            try
            {
                var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var userDataFolder = Path.Combine(localAppData, "VRCFX", "WebView2Data");
                Directory.CreateDirectory(userDataFolder);

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await WebViewControl.EnsureCoreWebView2Async(env);

                WebViewControl.CoreWebView2.Settings.IsStatusBarEnabled = false;
                WebViewControl.CoreWebView2.Settings.AreDevToolsEnabled = true;
                WebViewControl.CoreWebView2.Settings.IsZoomControlEnabled = false;

                // Find local dist folder
                var baseDir = AppDomain.CurrentDomain.BaseDirectory;
                var distPath = Path.Combine(baseDir, "dist");
                if (!Directory.Exists(distPath))
                {
                    var projRoot = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "dist"));
                    if (Directory.Exists(projRoot)) distPath = projRoot;
                }

                await WebViewControl.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
                    (function() {
                        function formatArg(a) {
                            if (a instanceof Error) {
                                return a.name + ': ' + a.message + '\n' + (a.stack || '');
                            }
                            if (typeof a === 'object' && a !== null) {
                                try {
                                    return JSON.stringify(a);
                                } catch(e) {
                                    return String(a);
                                }
                            }
                            return String(a);
                        }
                        function sendDebug(type, payload) {
                            try {
                                window.chrome.webview.postMessage({ channel: 'debug:log', data: { type: type, payload: payload } });
                            } catch(e) {}
                        }
                        window.addEventListener('error', function(e) {
                            sendDebug('ERROR', (e.message || '') + ' at ' + (e.filename || '') + ':' + (e.lineno || '') + '\n' + (e.error ? (e.error.stack || e.error.message) : ''));
                        });
                        window.addEventListener('unhandledrejection', function(e) {
                            sendDebug('UNHANDLED_REJECTION', e.reason ? (e.reason.stack || e.reason.message || String(e.reason)) : 'Unknown rejection');
                        });
                        const _log = console.log;
                        console.log = function(...args) {
                            _log.apply(console, args);
                            sendDebug('LOG', args.map(formatArg).join(' '));
                        };
                        const _err = console.error;
                        console.error = function(...args) {
                            _err.apply(console, args);
                            sendDebug('CONSOLE_ERROR', args.map(formatArg).join(' '));
                        };
                    })();
                ");

                WebViewControl.NavigationCompleted += (s, args) =>
                {
                    try
                    {
                        var logFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "VRCFX");
                        Directory.CreateDirectory(logFolder);
                        File.AppendAllText(Path.Combine(logFolder, "webview.log"), $"[NavCompleted] Success: {args.IsSuccess}, Status: {args.WebErrorStatus}, Uri: {WebViewControl.Source}\n");
                    }
                    catch { }
                };

                _webServer = new EmbeddedWebServer(distPath);
                _webServer.Start();

                var targetUrl = $"http://127.0.0.1:{_webServer.Port}/index.html";
                WebViewControl.CoreWebView2.Navigate(targetUrl);

                WebViewControl.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MainWindow] InitializeWebView error: {ex.Message}");
            }
        }

        private async void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var rawJson = e.WebMessageAsJson;
                var node = JsonNode.Parse(rawJson);
                if (node == null) return;

                var channel = node["channel"]?.GetValue<string>();
                if (channel == "debug:log")
                {
                    try
                    {
                        var logFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "VRCFX");
                        Directory.CreateDirectory(logFolder);
                        File.AppendAllText(Path.Combine(logFolder, "webview-console.log"), $"{DateTime.Now:HH:mm:ss.fff} {rawJson}\n");
                    }
                    catch { }
                    return;
                }

                var id = node["id"]?.ToString();
                var channelName = node["channel"]?.ToString() ?? "";
                var data = node["data"];

                var (result, error) = await HandleIpcChannelAsync(channelName, data);

                if (!string.IsNullOrEmpty(id))
                {
                    SendIpcResponse(id, channel, result, error);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MainWindow] IPC dispatch error: {ex.Message}");
            }
        }

        private async Task<(object? result, string? error)> HandleIpcChannelAsync(string channel, JsonNode? data)
        {
            try
            {
                switch (channel)
                {
                    // Auth
                    case "auth:login":
                        {
                            var username = data?["username"]?.ToString() ?? "";
                            var password = data?["password"]?.ToString() ?? "";
                            var code = data?["code"]?.ToString();
                            var res = await _api.LoginAsync(username, password, code);
                            var loginNode = JsonSerializer.SerializeToNode(res);
                            if (loginNode?["success"]?.GetValue<bool>() == true)
                            {
                                _friendsTracker.Start();
                            }
                            return (res, null);
                        }
                    case "auth:verify2fa":
                        {
                            var code = data?["code"]?.ToString() ?? "";
                            var authType = data?["authType"]?.ToString() ?? "totp";
                            var res = await _api.Verify2FAAsync(code, authType);
                            var verifyNode = JsonSerializer.SerializeToNode(res);
                            if (verifyNode?["success"]?.GetValue<bool>() == true)
                            {
                                _friendsTracker.Start();
                            }
                            return (res, null);
                        }
                    case "auth:checkSession":
                        {
                            var res = await _api.CheckSessionAsync();
                            return (res, null);
                        }
                    case "auth:logout":
                        {
                            _friendsTracker.Stop();
                            await _api.LogoutAsync();
                            return (new { success = true }, null);
                        }

                    // Friends
                    case "friends:get":
                        {
                            var forceRefresh = data?["forceRefresh"]?.GetValue<bool>() ?? false;
                            var (online, offline) = await _api.GetFriendsAsync(forceRefresh);
                            return (new { online, offline }, null);
                        }
                    case "friends:delete":
                        {
                            var userId = data?.ToString() ?? "";
                            var res = await _api.DeleteFriendAsync(userId);
                            return (new { success = res }, null);
                        }
                    case "friends:deleteBulk":
                        {
                            var userIds = data?.AsArray().Select(x => x?.ToString() ?? "").ToList() ?? new List<string>();
                            var deleted = new List<string>();
                            var failed = new List<object>();
                            foreach (var uid in userIds)
                            {
                                var ok = await _api.DeleteFriendAsync(uid);
                                if (ok) deleted.Add(uid);
                                else failed.Add(new { id = uid, error = "Failed" });
                                await Task.Delay(200);
                            }
                            return (new { success = true, deleted, failed }, null);
                        }
                    case "friends:saveNote":
                        {
                            var userId = data?["userId"]?.ToString() ?? "";
                            var nickname = data?["nickname"]?.ToString();
                            var note = data?["note"]?.ToString();
                            _store.SaveFriendNote(userId, nickname, note);
                            return (new { success = true }, null);
                        }
                    case "friends:sync":
                        {
                            await _friendsTracker.CheckFullFriendsAsync(true);
                            return (new { success = true }, null);
                        }
                    case "friends:getKnown":
                        {
                            var known = _store.GetKnownFriends();
                            return (known, null);
                        }

                    // Search & Profiles
                    case "worlds:search":
                        {
                            var q = data?["query"]?.ToString() ?? "";
                            var n = data?["n"]?.GetValue<int>() ?? 60;
                            var offset = data?["offset"]?.GetValue<int>() ?? 0;
                            var sort = data?["sort"]?.ToString() ?? "popularity";
                            var res = await _api.SearchWorldsAsync(q, n, offset, sort);
                            return (res, null);
                        }
                    case "avatars:search":
                        {
                            var q = data?["query"]?.ToString() ?? "";
                            var n = data?["n"]?.GetValue<int>() ?? 60;
                            var offset = data?["offset"]?.GetValue<int>() ?? 0;
                            var res = await _api.SearchAvatarsAsync(q, n, offset);
                            return (res, null);
                        }
                    case "avatars:select":
                        {
                            string avatarId = "";
                            if (data is JsonValue jv)
                            {
                                avatarId = jv.ToString() ?? "";
                            }
                            else if (data != null)
                            {
                                avatarId = data["avatarId"]?.ToString()
                                    ?? data["id"]?.ToString()
                                    ?? data.ToString()
                                    ?? "";
                            }
                            // Strip JSON quotes if present
                            avatarId = avatarId.Trim().Trim('"');
                            var res = await _api.SelectAvatarAsync(avatarId);
                            return (res, null);
                        }
                    case "users:getProfile":
                        {
                            var userId = data?.ToString() ?? "";
                            var res = await _api.GetUserProfileAsync(userId);
                            return (res, null);
                        }

                    // Instances & Links
                    case "instance:launch":
                        {
                            var loc = data?.ToString() ?? "";
                            _api.LaunchInstance(loc);
                            return (new { success = true }, null);
                        }
                    case "util:openExternal":
                        {
                            var url = data?.ToString() ?? "";
                            _api.OpenExternalUrl(url);
                            return (new { success = true }, null);
                        }

                    // OSC
                    case "osc:chatbox":
                        {
                            var msg = data?["message"]?.ToString() ?? "";
                            var direct = data?["direct"]?.GetValue<bool>() ?? true;
                            var complete = data?["complete"]?.GetValue<bool>() ?? true;
                            _osc.SendChatbox(msg, direct, complete);
                            return (new { success = true }, null);
                        }
                    case "osc:typing":
                        {
                            var typing = data?["isTyping"]?.GetValue<bool>() ?? false;
                            _osc.SetChatboxTyping(typing);
                            return (new { success = true }, null);
                        }
                    case "osc:avatarParam":
                        {
                            var name = data?["name"]?.ToString() ?? "";
                            var val = data?["value"]?.ToString() ?? "";
                            _osc.SetAvatarParam(name, val);
                            return (new { success = true }, null);
                        }

                    // Log Watcher & Radar
                    case "log:getState":
                        {
                            var state = _logWatcher.GetState();
                            return (state, null);
                        }
                    case "log:restart":
                        {
                            _logWatcher.Start();
                            return (_logWatcher.GetState(), null);
                        }

                    // Settings & Store
                    case "settings:get":
                        {
                            return (_store.GetSettings(), null);
                        }
                    case "settings:save":
                        {
                            if (data != null)
                            {
                                var s = JsonSerializer.Deserialize<AppSettings>(data.ToJsonString());
                                if (s != null) _store.SaveSettings(s);
                            }
                            return (new { success = true }, null);
                        }
                    case "history:getVisitedInstances":
                        {
                            return (_store.GetVisitedInstances(), null);
                        }
                    case "history:clearVisitedInstances":
                        {
                            _store.ClearVisitedInstances();
                            return (new { success = true }, null);
                        }
                    case "activity:getLogs":
                        {
                            return (_store.GetActivityLogs(), null);
                        }
                    case "activity:clearLogs":
                        {
                            _store.ClearActivityLogs();
                            return (new { success = true }, null);
                        }

                    // Window controls
                    case "window:minimize":
                        {
                            Dispatcher.Invoke(() => WindowState = WindowState.Minimized);
                            return (true, null);
                        }
                    case "window:maximize":
                        {
                            Dispatcher.Invoke(() =>
                            {
                                WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
                            });
                            return (true, null);
                        }
                    case "window:close":
                        {
                            Dispatcher.Invoke(() =>
                            {
                                var s = _store.GetSettings();
                                if (s.MinimizeToTray)
                                {
                                    Hide();
                                }
                                else
                                {
                                    ForceQuit();
                                }
                            });
                            return (true, null);
                        }
                    case "window:isMaximized":
                        {
                            bool max = false;
                            Dispatcher.Invoke(() => max = WindowState == WindowState.Maximized);
                            return (max, null);
                        }
                    case "window:drag":
                        {
                            Dispatcher.Invoke(() =>
                            {
                                try
                                {
                                    if (WindowState == WindowState.Normal)
                                    {
                                        DragMove();
                                    }
                                }
                                catch { }
                            });
                            return (true, null);
                        }

                    // Floating Overlay
                    case "overlay:showNotification":
                        {
                            if (data != null)
                            {
                                var payload = JsonSerializer.Deserialize<OverlayNotificationPayload>(data.ToJsonString());
                                if (payload != null) _overlayManager.Show(payload);
                            }
                            return (true, null);
                        }

                    // Notes & History
                    case "notes:get":
                        {
                            return (_store.GetFriendNotes(), null);
                        }
                    case "history:getNameHistory":
                        {
                            var userId = data?.ToString() ?? "";
                            var history = _store.GetNameHistory();
                            if (history.TryGetValue(userId, out var list))
                            {
                                return (list, null);
                            }
                            return (new List<PastDisplayName>(), null);
                        }

                    // Favorites & Profile Update
                    case "worlds:getFavorites":
                        {
                            var favs = await _api.GetFavoriteWorldsAsync();
                            return (favs, null);
                        }
                    case "users:updateProfile":
                        {
                            var bio = data?["bio"]?.ToString();
                            var status = data?["status"]?.ToString();
                            var statusDesc = data?["statusDescription"]?.ToString();
                            var res = await _api.UpdateProfileAsync(bio, status, statusDesc);
                            return (res, null);
                        }

                    // Directory selector
                    case "settings:selectLogDir":
                        {
                            string? selectedPath = null;
                            Dispatcher.Invoke(() =>
                            {
                                using var dialog = new Forms.FolderBrowserDialog
                                {
                                    Description = "Select VRChat Output Log Directory"
                                };
                                if (dialog.ShowDialog() == Forms.DialogResult.OK)
                                {
                                    selectedPath = dialog.SelectedPath;
                                }
                            });
                            return (selectedPath, null);
                        }

                    default:
                        Console.WriteLine($"[MainWindow] Handled unknown channel safely: {channel}");
                        return (new { success = true }, null);
                }
            }
            catch (Exception ex)
            {
                return (null, ex.Message);
            }
        }

        private void SendIpcResponse(string id, string channel, object? data, string? error)
        {
            var response = new
            {
                id,
                channel,
                data,
                error
            };
            var json = JsonSerializer.Serialize(response);
            Dispatcher.Invoke(() =>
            {
                WebViewControl.CoreWebView2?.PostWebMessageAsJson(json);
            });
        }

        public void SendWebEvent(string channel, object data)
        {
            var evt = new
            {
                channel,
                data
            };
            var json = JsonSerializer.Serialize(evt);
            Dispatcher.Invoke(() =>
            {
                try
                {
                    WebViewControl.CoreWebView2?.PostWebMessageAsJson(json);
                }
                catch { }
            });
        }

        public void RestoreFromTray()
        {
            Show();
            if (WindowState == WindowState.Minimized)
            {
                WindowState = WindowState.Normal;
            }
            Activate();
            Focus();
        }

        public void TriggerSyncFriends()
        {
            _ = _friendsTracker.CheckFullFriendsAsync(true);
        }

        public void SendAlreadyRunningNotice()
        {
            SendWebEvent("app:alreadyRunningNotice", new
            {
                title = "VRCFX is already active",
                message = "The application is already running in your background tray and has been focused.",
                timestamp = DateTime.Now.ToString("hh:mm tt")
            });
        }

        public void ForceQuit()
        {
            _isForceQuit = true;
            _webServer?.Stop();
            _logWatcher.Dispose();
            _friendsTracker.Dispose();
            _osc.Dispose();
            Close();
            Application.Current.Shutdown();
        }

        private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            if (!_isForceQuit)
            {
                var settings = _store.GetSettings();
                if (settings.MinimizeToTray)
                {
                    e.Cancel = true;
                    Hide();
                    return;
                }
            }

            _friendsTracker.Stop();
            _logWatcher.Stop();
            _store.FlushPendingSave();
        }
    }
}
