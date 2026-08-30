using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using VRCFX.Host.Models;

namespace VRCFX.Host.Services
{
    public class OverlayNotificationManager
    {
        private const int MaxActiveSlots = 3;
        private const double NotificationWidth = 380;
        private const double NotificationHeight = 92;
        private const double Gap = 10;
        private const double Margin = 18;
        private const int DisplayMs = 5200;
        private const int ExitAnimMs = 320;

        private readonly JsonStore _store;
        private readonly Dictionary<int, OverlaySlot> _activeWindows = new();
        private readonly Queue<OverlayNotificationPayload> _queue = new();
        private readonly object _lock = new();

        private sealed class OverlaySlot
        {
            public Window Window { get; set; } = null!;
            public System.Windows.Threading.DispatcherTimer? Timer { get; set; }
            public bool IsClosing { get; set; }
        }

        public OverlayNotificationManager(JsonStore store)
        {
            _store = store;
        }

        public void Show(OverlayNotificationPayload payload)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                lock (_lock)
                {
                    var freeSlot = -1;
                    for (int i = 0; i < MaxActiveSlots; i++)
                    {
                        if (!_activeWindows.ContainsKey(i))
                        {
                            freeSlot = i;
                            break;
                        }
                    }

                    if (freeSlot == -1)
                    {
                        _queue.Enqueue(payload);
                        return;
                    }

                    CreateNotificationWindow(freeSlot, payload);
                }
            });
        }

        private void CreateNotificationWindow(int slotIndex, OverlayNotificationPayload payload)
        {
            var position = _store.GetSettings().NotificationPosition ?? "bottom-right";
            var cursorPoint = System.Windows.Forms.Cursor.Position;
            var screen = System.Windows.Forms.Screen.FromPoint(cursorPoint);
            var workArea = screen.WorkingArea;

            var (targetX, targetY, slideFromRight) = GetPosition(slotIndex, position, workArea);
            var startX = slideFromRight ? targetX + 36 : targetX - 36;

            var (accentBrush, badgeBgBrush, badgeTextBrush, badgeLabel, ringBrush) = GetAccentStyle(payload.AccentType);

            var root = new Grid();

            var card = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(17, 17, 20)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(23, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                ClipToBounds = true
            };

            var layout = new Grid();
            layout.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(3) });
            layout.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var accentBar = new Border { Background = accentBrush };
            Grid.SetColumn(accentBar, 0);
            layout.Children.Add(accentBar);

            var body = new Grid { Margin = new Thickness(12, 12, 14, 16) };
            body.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(48) });
            body.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            var avatarBorder = new Border
            {
                Width = 48,
                Height = 48,
                CornerRadius = new CornerRadius(8),
                Background = new SolidColorBrush(Color.FromRgb(26, 26, 31)),
                BorderBrush = ringBrush,
                BorderThickness = new Thickness(2),
                ClipToBounds = true
            };

            if (!string.IsNullOrEmpty(payload.AvatarUrl))
            {
                try
                {
                    avatarBorder.Child = new Image
                    {
                        Source = new BitmapImage(new Uri(payload.AvatarUrl)),
                        Stretch = Stretch.UniformToFill
                    };
                }
                catch
                {
                    avatarBorder.Child = CreateFallbackAvatar(payload.Title, accentBrush);
                }
            }
            else
            {
                avatarBorder.Child = CreateFallbackAvatar(payload.Title, accentBrush);
            }

            Grid.SetColumn(avatarBorder, 0);
            body.Children.Add(avatarBorder);

            var info = new StackPanel { Margin = new Thickness(12, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };

            var header = new Grid();
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            header.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var title = new TextBlock
            {
                Text = payload.Title,
                FontWeight = FontWeights.SemiBold,
                FontSize = 13,
                Foreground = new SolidColorBrush(Color.FromRgb(244, 244, 245)),
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            Grid.SetColumn(title, 0);
            header.Children.Add(title);

            var badge = new Border
            {
                Background = badgeBgBrush,
                CornerRadius = new CornerRadius(4),
                Padding = new Thickness(7, 2, 7, 2),
                Margin = new Thickness(8, 0, 0, 0),
                Child = new TextBlock
                {
                    Text = badgeLabel,
                    FontSize = 9,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = badgeTextBrush
                }
            };
            Grid.SetColumn(badge, 1);
            header.Children.Add(badge);
            info.Children.Add(header);

            info.Children.Add(new TextBlock
            {
                Text = payload.Message,
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(161, 161, 170)),
                TextTrimming = TextTrimming.CharacterEllipsis,
                Margin = new Thickness(0, 3, 0, 0)
            });

            Grid.SetColumn(info, 1);
            body.Children.Add(info);

            Grid.SetColumn(body, 1);
            layout.Children.Add(body);

            var cardGrid = new Grid();
            cardGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            cardGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            Grid.SetRow(layout, 0);
            cardGrid.Children.Add(layout);

            var progressTrack = new Grid
            {
                Height = 2,
                Background = new SolidColorBrush(Color.FromArgb(15, 255, 255, 255))
            };
            var progressFill = new Border
            {
                Height = 2,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                Background = accentBrush,
                RenderTransformOrigin = new Point(0, 0.5),
                RenderTransform = new ScaleTransform(1, 1)
            };
            progressTrack.Children.Add(progressFill);
            Grid.SetRow(progressTrack, 1);
            cardGrid.Children.Add(progressTrack);

            card.Child = cardGrid;
            root.Children.Add(card);

            var win = new Window
            {
                Width = NotificationWidth,
                Height = NotificationHeight,
                WindowStyle = WindowStyle.None,
                AllowsTransparency = true,
                Background = Brushes.Transparent,
                Topmost = true,
                ShowInTaskbar = false,
                Focusable = false,
                ShowActivated = false,
                Left = startX,
                Top = targetY,
                Opacity = 0,
                Content = root
            };

            var slot = new OverlaySlot { Window = win };
            _activeWindows[slotIndex] = slot;
            win.Show();

            var slideIn = new DoubleAnimation(startX, targetX, TimeSpan.FromMilliseconds(380))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300));
            win.BeginAnimation(Window.LeftProperty, slideIn);
            win.BeginAnimation(UIElement.OpacityProperty, fadeIn);

            var progressAnim = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(DisplayMs - 200));
            ((ScaleTransform)progressFill.RenderTransform).BeginAnimation(ScaleTransform.ScaleXProperty, progressAnim);

            var timer = new System.Windows.Threading.DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(DisplayMs)
            };
            timer.Tick += (_, _) =>
            {
                timer.Stop();
                DismissWindow(slotIndex);
            };
            slot.Timer = timer;
            timer.Start();
        }

        private void DismissWindow(int slotIndex)
        {
            lock (_lock)
            {
                if (!_activeWindows.TryGetValue(slotIndex, out var slot) || slot.IsClosing)
                    return;

                slot.IsClosing = true;
                slot.Timer?.Stop();

                var win = slot.Window;
                var currentLeft = win.Left;
                var slideFromRight = _store.GetSettings().NotificationPosition is "bottom-right" or "top-right" or null;
                var exitX = slideFromRight ? currentLeft + 36 : currentLeft - 36;

                var slideOut = new DoubleAnimation(currentLeft, exitX, TimeSpan.FromMilliseconds(ExitAnimMs))
                {
                    EasingFunction = new CubicEase { EasingMode = EasingMode.EaseIn }
                };
                var fadeOut = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(ExitAnimMs));

                fadeOut.Completed += (_, _) =>
                {
                    win.Close();
                    _activeWindows.Remove(slotIndex);

                    if (_queue.Count > 0)
                    {
                        var next = _queue.Dequeue();
                        CreateNotificationWindow(slotIndex, next);
                    }
                };

                win.BeginAnimation(Window.LeftProperty, slideOut);
                win.BeginAnimation(UIElement.OpacityProperty, fadeOut);
            }
        }

        private static (double x, double y, bool slideFromRight) GetPosition(
            int slotIndex,
            string position,
            System.Drawing.Rectangle workArea)
        {
            var slideFromRight = position is "bottom-right" or "top-right" or null or "";
            var x = slideFromRight
                ? workArea.Right - NotificationWidth - Margin
                : workArea.Left + Margin;

            double y;
            if (position == "top-right" || position == "top-left")
            {
                y = workArea.Top + Margin + slotIndex * (NotificationHeight + Gap);
            }
            else
            {
                y = workArea.Bottom - ((slotIndex + 1) * (NotificationHeight + Gap)) - Margin;
            }

            return (x, y, slideFromRight);
        }

        private static UIElement CreateFallbackAvatar(string title, Brush accentBrush)
        {
            var initials = new string(title.Where(char.IsLetterOrDigit).Take(2).ToArray()).ToUpperInvariant();
            if (string.IsNullOrEmpty(initials)) initials = "FX";

            return new TextBlock
            {
                Text = initials,
                FontWeight = FontWeights.SemiBold,
                FontSize = 13,
                Foreground = accentBrush,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
        }

        private static (Brush accent, Brush badgeBg, Brush badgeText, string label, Brush ring) GetAccentStyle(string? type)
        {
            return type switch
            {
                "online" => (
                    new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                    new SolidColorBrush(Color.FromArgb(36, 16, 185, 129)),
                    new SolidColorBrush(Color.FromRgb(110, 231, 183)),
                    "Online",
                    new SolidColorBrush(Color.FromArgb(140, 16, 185, 129))
                ),
                "world" => (
                    new SolidColorBrush(Color.FromRgb(14, 165, 233)),
                    new SolidColorBrush(Color.FromArgb(36, 14, 165, 233)),
                    new SolidColorBrush(Color.FromRgb(125, 211, 252)),
                    "World",
                    new SolidColorBrush(Color.FromArgb(115, 14, 165, 233))
                ),
                "unfriended" => (
                    new SolidColorBrush(Color.FromRgb(225, 29, 72)),
                    new SolidColorBrush(Color.FromArgb(46, 225, 29, 72)),
                    new SolidColorBrush(Color.FromRgb(253, 164, 175)),
                    "Removed",
                    Brushes.Transparent
                ),
                "name_change" => (
                    new SolidColorBrush(Color.FromRgb(168, 85, 247)),
                    new SolidColorBrush(Color.FromArgb(36, 168, 85, 247)),
                    new SolidColorBrush(Color.FromRgb(216, 180, 254)),
                    "Renamed",
                    Brushes.Transparent
                ),
                _ => (
                    new SolidColorBrush(Color.FromRgb(225, 29, 72)),
                    new SolidColorBrush(Color.FromArgb(36, 225, 29, 72)),
                    new SolidColorBrush(Color.FromRgb(253, 164, 175)),
                    "VRCFX",
                    Brushes.Transparent
                )
            };
        }
    }
}
