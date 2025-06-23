public class ConversationState
{
    public bool InitialPromptSent { get; set; }
    public List<string> History { get; set; } = new();
}