using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using Forms = System.Windows.Forms;

namespace VRCFX.Host
{
    public partial class App : System.Windows.Application
    {
        private Forms.NotifyIcon? _trayIcon;

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        public void InitializeApp(MainWindow mainWindow)
        {
            SetupTrayIcon(mainWindow);
        }

        private void SetupTrayIcon(MainWindow mainWindow)
        {
            try
            {
                var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
                System.Drawing.Icon? icon = null;
                if (File.Exists(iconPath))
                {
                    icon = new System.Drawing.Icon(iconPath);
                }
                else
                {
                    icon = System.Drawing.SystemIcons.Application;
                }

                _trayIcon = new Forms.NotifyIcon
                {
                    Icon = icon,
                    Text = "VRCFX Assistant",
                    Visible = true
                };

                var contextMenu = new Forms.ContextMenuStrip();
                contextMenu.Items.Add("Open VRCFX", null, (s, e) => mainWindow.RestoreFromTray());
                contextMenu.Items.Add("Sync Friends", null, (s, e) => mainWindow.TriggerSyncFriends());
                contextMenu.Items.Add("-");
                contextMenu.Items.Add("Exit VRCFX", null, (s, e) =>
                {
                    if (_trayIcon != null)
                    {
                        _trayIcon.Visible = false;
                        _trayIcon.Dispose();
                    }
                    mainWindow.ForceQuit();
                });

                _trayIcon.ContextMenuStrip = contextMenu;
                _trayIcon.DoubleClick += (s, e) => mainWindow.RestoreFromTray();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App] SetupTrayIcon error: {ex.Message}");
            }
        }

        protected override void OnExit(ExitEventArgs e)
        {
            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
            }
            base.OnExit(e);
        }
    }
}
