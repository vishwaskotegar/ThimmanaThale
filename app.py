from flask import Flask, request, Response, stream_with_context
import ollama

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "Hello, World!"

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = data.get('prompt', '')

    def generate_response(user_prompt):
        stream = ollama.chat(
            model='qwen3:8b',
            messages=[{'role': 'user', 'content': user_prompt}],
            stream=True,
            # think=True
        )

        in_thinking = False

        for chunk in stream:
            if chunk.message.thinking and not in_thinking:
                in_thinking = True
                yield f"Thinking: \n"

            if chunk.message.thinking:
                yield f"{chunk.message.thinking}"
            elif chunk.message.content:
                if in_thinking:
                    yield f'\nDone thinking\n\n'
                    in_thinking = False
                yield f"{chunk.message.content}"

        # for chunk in stream:
        #     message = chunk.get("message", {})

        #     if "thinking" in message:
        #         yield f"data: [thinking] {message['thinking']}\n\n"

        #     if "content" in message:
        #         yield f"data: {message['content']}\n\n"

    return Response(
        stream_with_context(generate_response(prompt)),
        mimetype='text/event-stream'
    )

if __name__ == '__main__':
    app.run(threaded=True, debug=True)