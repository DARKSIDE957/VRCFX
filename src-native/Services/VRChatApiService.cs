using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using VRCFX.Host.Models;

namespace VRCFX.Host.Services
{
    public class VRChatApiService
    {
        private const string ApiBaseUrl = "https://api.vrchat.cloud/api/1";
        private const string ApiKey = "JlE5Jldo5Jibnk5O5hTx6izvhY2ExrU7";
        private const string UserAgent = "VRCFX/1.0.0 (contact: support@vrcfx.app)";

        private readonly JsonStore _store;
        private readonly HttpClient _client;
        private readonly CookieContainer _cookieContainer;
        private VRCUser? _currentUser;

        public VRChatApiService(JsonStore store)
        {
            _store = store;
            _cookieContainer = new CookieContainer();
            
            var handler = new HttpClientHandler
            {
                CookieContainer = _cookieContainer,
                UseCookies = true,
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
            };

            _client = new HttpClient(handler)
            {
                BaseAddress = new Uri(ApiBaseUrl)
            };
            _client.DefaultRequestHeaders.Add("User-Agent", UserAgent);
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            LoadSavedCookies();
        }

        private void LoadSavedCookies()
        {
            var cookies = _store.GetCookies();
            var uri = new Uri(ApiBaseUrl);
            foreach (var (key, value) in cookies)
            {
                try
                {
                    _cookieContainer.Add(uri, new Cookie(key, value));
                }
                catch { }
            }
        }

        private void PersistCookies()
        {
            var uri = new Uri(ApiBaseUrl);
            var cookies = _cookieContainer.GetCookies(uri);
            var dict = new Dictionary<string, string>();
            foreach (Cookie c in cookies)
            {
                dict[c.Name] = c.Value;
            }
            _store.SetCookies(dict);
        }

        private string AppendApiKey(string path)
        {
            var separator = path.Contains('?') ? "&" : "?";
            return $"{path}{separator}apiKey={ApiKey}";
        }

        public bool HasSavedSession()
        {
            var cookies = _store.GetCookies();
            return cookies.ContainsKey("auth") || cookies.ContainsKey("twoFactorAuth");
        }

        public async Task<object> LoginAsync(string username, string password, string? code = null)
        {
            try
            {
                var authBytes = Encoding.UTF8.GetBytes($"{username}:{password}");
                var authHeader = Convert.ToBase64String(authBytes);

                using var request = new HttpRequestMessage(HttpMethod.Get, AppendApiKey("/auth/user"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

                var response = await _client.SendAsync(request);
                PersistCookies();

                var content = await response.Content.ReadAsStringAsync();
                var json = JsonNode.Parse(content);

                if (response.IsSuccessStatusCode && json != null)
                {
                    if (json["requiresTwoFactorAuth"] != null)
                    {
                        var types = json["requiresTwoFactorAuth"]?.AsArray().Select(x => x?.ToString() ?? "").ToList() ?? new List<string>();
                        return new { requires2FA = true, twoFactorAuthTypes = types };
                    }

                    _currentUser = FormatUser(json);
                    _store.SetLastUser(_currentUser);
                    return new { success = true, user = _currentUser };
                }

                var errMsg = json?["error"]?["message"]?.ToString() ?? "Login failed. Check your credentials.";
                return new { success = false, error = errMsg };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public async Task<object> Verify2FAAsync(string code, string authType = "totp")
        {
            try
            {
                var endpoint = authType == "emailOtp" ? "/auth/twofactorauth/emailotp/verify" : "/auth/twofactorauth/totp/verify";
                var payload = new { code };
                var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await _client.PostAsync(AppendApiKey(endpoint), jsonContent);
                PersistCookies();

                var content = await response.Content.ReadAsStringAsync();
                var json = JsonNode.Parse(content);

                if (response.IsSuccessStatusCode && json?["verified"]?.GetValue<bool>() == true)
                {
                    var userRes = await _client.GetAsync(AppendApiKey("/auth/user"));
                    PersistCookies();
                    var userContent = await userRes.Content.ReadAsStringAsync();
                    var userJson = JsonNode.Parse(userContent);

                    if (userJson != null)
                    {
                        _currentUser = FormatUser(userJson);
                        _store.SetLastUser(_currentUser);
                        return new { success = true, user = _currentUser };
                    }
                }

                return new { success = false, error = "Invalid 2FA code. Please try again." };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public async Task<object> CheckSessionAsync()
        {
            try
            {
                var response = await _client.GetAsync(AppendApiKey("/auth/user"));
                PersistCookies();

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var json = JsonNode.Parse(content);
                    if (json != null && json["id"] != null)
                    {
                        _currentUser = FormatUser(json);
                        _store.SetLastUser(_currentUser);
                        return new { success = true, user = _currentUser };
                    }
                }

                var lastUser = _store.GetLastUser();
                if (lastUser != null && HasSavedSession())
                {
                    _currentUser = lastUser;
                    return new { success = true, user = lastUser, cached = true };
                }

                return new { success = false, error = "Session expired. Please log in again." };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public async Task LogoutAsync()
        {
            try
            {
                await _client.PutAsync(AppendApiKey("/logout"), null);
            }
            catch { }

            _cookieContainer.SetCookies(new Uri(ApiBaseUrl), "");
            _currentUser = null;
            _store.SetCookies(new Dictionary<string, string>());
            _store.SetLastUser(null);
        }

        public async Task<List<VRCUser>> GetOnlineFriendsAsync()
        {
            try
            {
                var response = await _client.GetAsync(AppendApiKey("/auth/user/friends?offline=false&n=100"));
                PersistCookies();

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var array = JsonNode.Parse(content) as JsonArray;
                    if (array != null)
                    {
                        return array.Select(x => FormatUser(x!)).ToList();
                    }
                }
                return new List<VRCUser>();
            }
            catch
            {
                return new List<VRCUser>();
            }
        }

        public async Task<(List<VRCUser> online, List<VRCUser> offline)> GetFriendsAsync(bool forceRefresh = false)
        {
            try
            {
                var onlineTask = _client.GetAsync(AppendApiKey("/auth/user/friends?offline=false&n=100"));
                var offlineTask = _client.GetAsync(AppendApiKey("/auth/user/friends?offline=true&n=100"));
                var favTask = _client.GetAsync(AppendApiKey("/favorites?type=friend&n=100"));

                await Task.WhenAll(onlineTask, offlineTask, favTask);
                PersistCookies();

                var favMap = new Dictionary<string, string>();
                try
                {
                    var favContent = await favTask.Result.Content.ReadAsStringAsync();
                    var favArr = JsonNode.Parse(favContent) as JsonArray;
                    if (favArr != null)
                    {
                        foreach (var f in favArr)
                        {
                            var favId = f?["favoriteId"]?.ToString();
                            var tag = f?["tags"]?.AsArray().FirstOrDefault()?.ToString() ?? "group_0";
                            if (!string.IsNullOrEmpty(favId)) favMap[favId] = tag;
                        }
                    }
                }
                catch { }

                VRCUser FormatWithFav(JsonNode? node)
                {
                    if (node == null) return new VRCUser();
                    var user = FormatUser(node);
                    if (favMap.TryGetValue(user.Id, out var group))
                    {
                        user.IsFavorite = true;
                        user.FavoriteGroup = group;
                    }
                    return user;
                }

                var online = new List<VRCUser>();
                if (onlineTask.Result.IsSuccessStatusCode)
                {
                    var c = await onlineTask.Result.Content.ReadAsStringAsync();
                    var arr = JsonNode.Parse(c) as JsonArray;
                    if (arr != null) online = arr.Select(FormatWithFav).ToList();
                }

                var offline = new List<VRCUser>();
                if (offlineTask.Result.IsSuccessStatusCode)
                {
                    var c = await offlineTask.Result.Content.ReadAsStringAsync();
                    var arr = JsonNode.Parse(c) as JsonArray;
                    if (arr != null) offline = arr.Select(FormatWithFav).ToList();
                }

                // Pagination if 100 offline friends returned
                if (offline.Count == 100)
                {
                    for (int offset = 100; offset <= 400; offset += 100)
                    {
                        var nextRes = await _client.GetAsync(AppendApiKey($"/auth/user/friends?offline=true&n=100&offset={offset}"));
                        if (nextRes.IsSuccessStatusCode)
                        {
                            var nc = await nextRes.Content.ReadAsStringAsync();
                            var narr = JsonNode.Parse(nc) as JsonArray;
                            if (narr != null && narr.Count > 0)
                            {
                                offline.AddRange(narr.Select(FormatWithFav));
                                if (narr.Count < 100) break;
                            }
                            else break;
                        }
                        else break;
                    }
                }

                var all = online.Concat(offline).ToList();
                _store.SetCachedFriends(all);
                return (online, offline);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VRChatApi] GetFriends failed: {ex.Message}");
                var cached = _store.GetCachedFriends();
                var on = cached.Where(u => u.Location != "offline").ToList();
                var off = cached.Where(u => u.Location == "offline").ToList();
                return (on, off);
            }
        }

        public async Task<VRCUser?> GetUserProfileAsync(string userId)
        {
            try
            {
                var res = await _client.GetAsync(AppendApiKey($"/users/{userId}"));
                PersistCookies();
                if (res.IsSuccessStatusCode)
                {
                    var content = await res.Content.ReadAsStringAsync();
                    var json = JsonNode.Parse(content);
                    if (json != null) return FormatUser(json);
                }
                return null;
            }
            catch
            {
                return null;
            }
        }

        public async Task<bool> DeleteFriendAsync(string userId)
        {
            try
            {
                var res = await _client.DeleteAsync(AppendApiKey($"/auth/user/friends/{userId}"));
                PersistCookies();
                return res.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public async Task<object> GetFavoriteWorldsAsync()
        {
            try
            {
                var res = await _client.GetAsync(AppendApiKey("/worlds/favorites?n=60"));
                PersistCookies();
                if (res.IsSuccessStatusCode)
                {
                    var content = await res.Content.ReadAsStringAsync();
                    return JsonNode.Parse(content) ?? (object)new List<object>();
                }
                return new List<object>();
            }
            catch
            {
                return new List<object>();
            }
        }

        public async Task<object> UpdateProfileAsync(string? bio, string? status, string? statusDescription)
        {
            try
            {
                var payload = new JsonObject();
                if (bio != null) payload["bio"] = bio;
                if (status != null) payload["status"] = status;
                if (statusDescription != null) payload["statusDescription"] = statusDescription;

                var body = new StringContent(payload.ToJsonString(), System.Text.Encoding.UTF8, "application/json");
                var userId = _currentUser?.Id;
                if (string.IsNullOrEmpty(userId)) return new { success = false, error = "Not logged in" };

                var res = await _client.PutAsync(AppendApiKey($"/users/{userId}"), body);
                PersistCookies();
                if (res.IsSuccessStatusCode)
                {
                    var content = await res.Content.ReadAsStringAsync();
                    var node = JsonNode.Parse(content);
                    if (node != null)
                    {
                        var user = FormatUser(node);
                        _currentUser = user;
                        _store.SetLastUser(user);
                        return new { success = true, user };
                    }
                }
                return new { success = false, error = "Failed to update profile" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public async Task<object> SearchWorldsAsync(string query, int n = 60, int offset = 0, string sort = "popularity")
        {
            try
            {
                n = Math.Clamp(n, 1, 100);
                var clean = (query ?? "").Trim();
                var sortValue = string.IsNullOrWhiteSpace(sort) ? (string.IsNullOrEmpty(clean) ? "popularity" : "relevance") : sort;

                async Task<JsonNode?> FetchAsync(string path)
                {
                    var res = await _client.GetAsync(AppendApiKey(path));
                    PersistCookies();
                    if (!res.IsSuccessStatusCode) return null;
                    var content = await res.Content.ReadAsStringAsync();
                    return JsonNode.Parse(content);
                }

                if (string.IsNullOrEmpty(clean))
                {
                    var active = await FetchAsync($"/worlds/active?n={n}&offset={offset}&sort={Uri.EscapeDataString(sortValue)}&order=descending&releaseStatus=public");
                    if (active is JsonArray activeArr && activeArr.Count > 0) return active;
                }

                var searchPart = string.IsNullOrEmpty(clean) ? "" : $"&search={Uri.EscapeDataString(clean)}&fuzzy=true";
                var primary = await FetchAsync($"/worlds?n={n}&offset={offset}&sort={Uri.EscapeDataString(sortValue)}&order=descending&releaseStatus=public{searchPart}");
                if (primary is JsonArray primaryArr && primaryArr.Count > 0) return primary;

                if (!string.IsNullOrEmpty(clean))
                {
                    var fallback = await FetchAsync($"/worlds?n={n}&search={Uri.EscapeDataString(clean)}&sort=popularity&order=descending&fuzzy=true&releaseStatus=public");
                    if (fallback is JsonArray fb && fb.Count > 0) return fallback;
                }

                return new JsonArray();
            }
            catch
            {
                return new JsonArray();
            }
        }

        public async Task<object> SearchAvatarsAsync(string query, int n = 60, int offset = 0)
        {
            try
            {
                n = Math.Clamp(n, 1, 100);
                var clean = (query ?? "").Trim();
                var results = new JsonArray();
                var seen = new HashSet<string>();

                void Merge(JsonNode? node)
                {
                    if (node is not JsonArray arr) return;
                    foreach (var item in arr)
                    {
                        var id = item?["id"]?.ToString() ?? "";
                        if (string.IsNullOrEmpty(id) || !id.StartsWith("avtr_") || !seen.Add(id)) continue;
                        results.Add(item!.DeepClone());
                    }
                }

                async Task<JsonNode?> GetAsync(string path)
                {
                    var res = await _client.GetAsync(AppendApiKey(path));
                    PersistCookies();
                    if (!res.IsSuccessStatusCode) return null;
                    return JsonNode.Parse(await res.Content.ReadAsStringAsync());
                }

                var tagPart = string.IsNullOrEmpty(clean) ? "" : $"&tag={Uri.EscapeDataString(clean.Replace(" ", ""))}";
                Merge(await GetAsync($"/avatars?featured=true&n={n}&order=descending&sort=popularity&releaseStatus=public{tagPart}"));
                Merge(await GetAsync($"/avatars?user=me&n={n}&order=descending&sort=updated&releaseStatus=all"));

                var favSearch = string.IsNullOrEmpty(clean) ? "" : $"&search={Uri.EscapeDataString(clean)}";
                Merge(await GetAsync($"/avatars/favorites?n={n}&order=descending&sort=updated{favSearch}"));

                if (results.Count > 0) return results;

                // Fallback: avatar worlds for discovery
                var worldQuery = string.IsNullOrEmpty(clean) ? "Avatar" : $"{clean} Avatar";
                return await SearchWorldsAsync(worldQuery, Math.Min(n, 30), 0, "relevance");
            }
            catch
            {
                return new JsonArray();
            }
        }

        public async Task<object> SelectAvatarAsync(string avatarId)
        {
            try
            {
                var id = (avatarId ?? "").Trim();
                if (!id.StartsWith("avtr_"))
                {
                    return new
                    {
                        success = false,
                        error = id.StartsWith("wrld_")
                            ? "That result is an Avatar World hub, not a wearable avatar."
                            : "Invalid avatar ID."
                    };
                }

                var res = await _client.PutAsync(AppendApiKey($"/avatars/{id}/select"), null);
                PersistCookies();
                var content = await res.Content.ReadAsStringAsync();
                var json = JsonNode.Parse(content);

                if (res.IsSuccessStatusCode && json != null)
                {
                    _currentUser = FormatUser(json);
                    if (string.IsNullOrEmpty(_currentUser.CurrentAvatarId))
                    {
                        _currentUser.CurrentAvatarId = id;
                    }
                    _store.SetLastUser(_currentUser);
                    return new { success = true, user = _currentUser };
                }

                var err = json?["error"]?["message"]?.ToString()
                    ?? (res.StatusCode == System.Net.HttpStatusCode.NotFound
                        ? "Avatar not found or inaccessible"
                        : $"HTTP {(int)res.StatusCode}");
                return new { success = false, error = err };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        public void LaunchInstance(string location)
        {
            if (string.IsNullOrWhiteSpace(location) || location == "offline" || location == "private") return;
            try
            {
                var uri = $"vrchat://launch?ref=vrcfx.app&id={location}";
                Process.Start(new ProcessStartInfo
                {
                    FileName = uri,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VRChatApi] LaunchInstance failed: {ex.Message}");
            }
        }

        public void OpenExternalUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return;
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch { }
        }

        private VRCUser FormatUser(JsonNode node)
        {
            var user = new VRCUser
            {
                Id = node["id"]?.ToString() ?? "",
                Username = node["username"]?.ToString() ?? "",
                DisplayName = node["displayName"]?.ToString() ?? "",
                UserIcon = node["userIcon"]?.ToString(),
                ProfilePicOverride = node["profilePicOverride"]?.ToString(),
                CurrentAvatarImageUrl = node["currentAvatarImageUrl"]?.ToString(),
                CurrentAvatarThumbnailImageUrl = node["currentAvatarThumbnailImageUrl"]?.ToString(),
                CurrentAvatarId = node["currentAvatar"]?.ToString() ?? node["currentAvatarId"]?.ToString(),
                Status = node["status"]?.ToString() ?? "offline",
                StatusDescription = node["statusDescription"]?.ToString() ?? "",
                State = node["state"]?.ToString() ?? "offline",
                DeveloperType = node["developerType"]?.ToString(),
                LastLogin = node["last_login"]?.ToString(),
                LastPlatform = node["last_platform"]?.ToString(),
                Location = node["location"]?.ToString() ?? "offline",
                WorldId = node["worldId"]?.ToString(),
                InstanceId = node["instanceId"]?.ToString(),
                FriendKey = node["friendKey"]?.ToString(),
                Bio = node["bio"]?.ToString(),
                IsFriend = node["isFriend"]?.GetValue<bool>()
            };

            var tags = node["tags"]?.AsArray().Select(x => x?.ToString() ?? "").ToArray();
            user.Tags = tags;
            user.TrustRank = DeriveTrustRank(tags);
            user.HasVRCPlus = tags?.Any(t => t.Contains("plus", StringComparison.OrdinalIgnoreCase)) == true;

            // Enrich with custom notes & past name history
            var notes = _store.GetFriendNotes();
            if (notes.TryGetValue(user.Id, out var note))
            {
                user.Nickname = note.Nickname;
                user.CustomNote = note.Note;
            }

            var nameHist = _store.GetNameHistory();
            if (nameHist.TryGetValue(user.Id, out var history))
            {
                user.PastDisplayNames = history.ToArray();
            }

            return user;
        }

        private static string DeriveTrustRank(string[]? tags)
        {
            if (tags == null || tags.Length == 0) return "Visitor";
            if (tags.Contains("system_admin")) return "VRChat Team";
            if (tags.Contains("system_legend")) return "Legend";
            if (tags.Contains("system_trust_veteran")) return "Trusted";
            if (tags.Contains("system_trust_trusted")) return "Known";
            if (tags.Contains("system_trust_known")) return "User";
            if (tags.Contains("system_trust_basic")) return "New User";
            return "Visitor";
        }
    }
}
