using System;
using System.IO;
using System.Windows;

namespace VRCFX.Host
{
    public static class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            Environment.CurrentDirectory = AppDomain.CurrentDomain.BaseDirectory;

            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                try
                {
                    var logFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "VRCFX");
                    Directory.CreateDirectory(logFolder);
                    File.WriteAllText(Path.Combine(logFolder, "app-crash.log"), e.ExceptionObject?.ToString() ?? "Unknown exception");
                }
                catch { }
            };

            var app = new App();
            app.InitializeComponent();

            var window = new MainWindow();
            app.InitializeApp(window);
            app.Run(window);
        }
    }
}
