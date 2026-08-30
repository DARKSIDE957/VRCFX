using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;

namespace VRCFX.Host.Services
{
    public class OscService : IDisposable
    {
        private const string DefaultHost = "127.0.0.1";
        private const int DefaultPort = 9000;
        private readonly UdpClient _udpClient;

        public OscService()
        {
            _udpClient = new UdpClient();
        }

        public void SendChatbox(string message, bool direct = true, bool complete = true)
        {
            if (string.IsNullOrEmpty(message)) return;
            try
            {
                var packet = BuildOscStringPacket("/chatbox/input", message, direct, complete);
                _udpClient.Send(packet, packet.Length, DefaultHost, DefaultPort);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OSC] SendChatbox error: {ex.Message}");
            }
        }

        public void SetChatboxTyping(bool isTyping)
        {
            try
            {
                var packet = BuildOscBoolPacket("/chatbox/typing", isTyping);
                _udpClient.Send(packet, packet.Length, DefaultHost, DefaultPort);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OSC] SetChatboxTyping error: {ex.Message}");
            }
        }

        public void SetAvatarParam(string paramName, object value)
        {
            try
            {
                var path = $"/avatar/parameters/{paramName}";
                byte[]? packet = value switch
                {
                    bool b => BuildOscBoolPacket(path, b),
                    int i => BuildOscIntPacket(path, i),
                    float f => BuildOscFloatPacket(path, f),
                    double d => BuildOscFloatPacket(path, (float)d),
                    string s => BuildOscStringPacket(path, s),
                    _ => null
                };

                if (packet != null)
                {
                    _udpClient.Send(packet, packet.Length, DefaultHost, DefaultPort);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[OSC] SetAvatarParam error: {ex.Message}");
            }
        }

        private static byte[] BuildOscStringPacket(string address, string value, bool direct = false, bool complete = false)
        {
            using var ms = new MemoryStream();
            WritePaddedString(ms, address);
            if (address == "/chatbox/input")
            {
                WritePaddedString(ms, ",sTF");
                WritePaddedString(ms, value);
            }
            else
            {
                WritePaddedString(ms, ",s");
                WritePaddedString(ms, value);
            }
            return ms.ToArray();
        }

        private static byte[] BuildOscBoolPacket(string address, bool value)
        {
            using var ms = new MemoryStream();
            WritePaddedString(ms, address);
            WritePaddedString(ms, value ? ",T" : ",F");
            return ms.ToArray();
        }

        private static byte[] BuildOscIntPacket(string address, int value)
        {
            using var ms = new MemoryStream();
            WritePaddedString(ms, address);
            WritePaddedString(ms, ",i");
            var bytes = BitConverter.GetBytes(IPAddress.HostToNetworkOrder(value));
            ms.Write(bytes, 0, bytes.Length);
            return ms.ToArray();
        }

        private static byte[] BuildOscFloatPacket(string address, float value)
        {
            using var ms = new MemoryStream();
            WritePaddedString(ms, address);
            WritePaddedString(ms, ",f");
            var bytes = BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian) Array.Reverse(bytes);
            ms.Write(bytes, 0, bytes.Length);
            return ms.ToArray();
        }

        private static void WritePaddedString(MemoryStream ms, string str)
        {
            var bytes = Encoding.ASCII.GetBytes(str);
            ms.Write(bytes, 0, bytes.Length);
            ms.WriteByte(0); // null-terminated
            while (ms.Length % 4 != 0)
            {
                ms.WriteByte(0); // 4-byte boundary padding
            }
        }

        public void Dispose()
        {
            _udpClient?.Dispose();
        }
    }
}
