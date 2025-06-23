public class ChatRequest
{
    public string SessionId { get; set; }  // Unique session identifier
    public string Topic { get; set; }
    public string UserInput { get; set; }
}