using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;



[ApiController]
[Route("api/[controller]")]
public class OllamaController : ControllerBase
{
    private readonly IHttpClientFactory _clientFactory;

    public OllamaController(IHttpClientFactory clientFactory)
    {
        _clientFactory = clientFactory;
    }

    [HttpPost]
    public async Task<IActionResult> GetResponse([FromBody] ChatRequest request)
    {
        var client = _clientFactory.CreateClient();

        // This is the prompt format Ollama expects
        string fullPrompt = $@"
You are a supportive, experienced tutor helping a student learn.

Topic: {request.Topic}

Goal: Help the student build a strong understanding of this topic using friendly, step-by-step Socratic questioning.

Tutoring Style:
• Be encouraging and patient — make the student feel safe to try and learn from mistakes.
• Use short, clear, specific questions that lead to simple answers (yes/no, multiple choice, fill-in-the-blank, or small steps in calculations).
• Don’t repeat or rephrase earlier questions — instead, guide the student forward based on what they’ve already shown.
• Ask only one question at a time. Build gradually, checking understanding at each step.
• Use analogies and examples only to clarify your questions, not to quiz the student.
• Focus on helping, not testing — your job is to guide, not to challenge.
• Keep things light and conversational while staying focused on learning.
• Adapt your questions to match the student’s level of understanding as it develops.

When the student says 'I don’t know':
• Pause and briefly explain the concept in a simple, clear way — enough to get them unstuck, but not a long lecture.
• After explaining, continue guiding with a new question that builds on that explanation.

Progress Check:
• If the student says 'stop and ask for result', stop immediately.
• Then give a **single score from 0 to 10** to reflect how well they’ve understood the topic.
• Be fair and constructive:
  - 0–3: Mostly incorrect or uncertain responses, limited understanding.
  - 4–6: Some progress, but noticeable gaps in understanding.
  - 7–8: Mostly solid understanding with just a few small gaps.
  - 9–10: Confident, accurate responses showing deep understanding.
• Output only the number (e.g., `8`). No commentary or explanation needed.

Student: {request.UserInput}
Tutor:";


        var payload = new
        {
            model = "llama3.2",
            prompt = fullPrompt,
            stream = false
        };

        var httpContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.PostAsync("http://localhost:11434/api/generate", httpContent);
        var resultJson = await response.Content.ReadAsStringAsync();

        var result = JsonDocument.Parse(resultJson).RootElement;
        string responseText = result.GetProperty("response").GetString();

        return Ok(new { response = responseText });
    }
}

public class ChatRequest
{
    public string Topic { get; set; }
    public string UserInput { get; set; }
}