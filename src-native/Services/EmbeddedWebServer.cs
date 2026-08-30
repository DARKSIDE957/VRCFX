using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace VRCFX.Host.Services
{
    public class EmbeddedWebServer
    {
        private HttpListener? _listener;
        private readonly string _distPath;
        public int Port { get; private set; } = 28777;

        public EmbeddedWebServer(string distPath)
        {
            _distPath = distPath;
        }

        public void Start()
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://127.0.0.1:{Port}/");
                _listener.Start();
                Task.Run(ListenLoop);
                Console.WriteLine($"[WebServer] Serving from {_distPath} on http://127.0.0.1:{Port}/");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebServer] Start error: {ex.Message}");
            }
        }

        private async Task ListenLoop()
        {
            while (_listener != null && _listener.IsListening)
            {
                try
                {
                    var ctx = await _listener.GetContextAsync();
                    _ = Task.Run(() => HandleRequest(ctx));
                }
                catch
                {
                    // Listener stopped or error
                }
            }
        }

        private void HandleRequest(HttpListenerContext ctx)
        {
            try
            {
                var rawPath = ctx.Request.Url?.AbsolutePath.TrimStart('/') ?? "";
                if (string.IsNullOrEmpty(rawPath) || rawPath == "/")
                {
                    rawPath = "index.html";
                }

                // Decode URL path
                rawPath = Uri.UnescapeDataString(rawPath);
                var filePath = Path.Combine(_distPath, rawPath.Replace('/', Path.DirectorySeparatorChar));

                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(_distPath, "index.html");
                }

                if (!File.Exists(filePath))
                {
                    ctx.Response.StatusCode = 404;
                    ctx.Response.Close();
                    return;
                }

                var bytes = File.ReadAllBytes(filePath);
                var ext = Path.GetExtension(filePath).ToLowerInvariant();

                ctx.Response.ContentType = ext switch
                {
                    ".html" => "text/html; charset=utf-8",
                    ".js" => "application/javascript; charset=utf-8",
                    ".css" => "text/css; charset=utf-8",
                    ".png" => "image/png",
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".svg" => "image/svg+xml",
                    ".json" => "application/json",
                    ".mp3" => "audio/mpeg",
                    ".ico" => "image/x-icon",
                    ".woff2" => "font/woff2",
                    ".woff" => "font/woff",
                    ".ttf" => "font/ttf",
                    _ => "application/octet-stream"
                };

                ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                ctx.Response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate");
                ctx.Response.ContentLength64 = bytes.Length;
                ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                ctx.Response.Close();
            }
            catch
            {
                try
                {
                    ctx.Response.StatusCode = 500;
                    ctx.Response.Close();
                }
                catch { }
            }
        }

        public void Stop()
        {
            try
            {
                _listener?.Stop();
                _listener?.Close();
            }
            catch { }
        }
    }
}
