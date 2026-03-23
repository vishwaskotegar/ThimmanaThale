from flask import Flask, request, Response, stream_with_context
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
import ollama
from langgraph.config import get_stream_writer

app = Flask(__name__)

class State(TypedDict):
    user_prompt: str
    token: str

def llm_node(state: State):
    writer = get_stream_writer()
    stream = ollama.chat(
        model='qwen3:8b',
        messages=[{'role': 'user', 'content': state["user_prompt"]}],
        stream=True,
        # think=True
    )

    in_thinking = False

    for chunk in stream:
        if chunk.message.thinking and not in_thinking:
            in_thinking = True
            writer({"token": "Thinking:\n"}) 

        if chunk.message.thinking:
            writer( {"token": chunk.message.thinking})

        elif chunk.message.content:
            if in_thinking:
                writer( {"token": "\nDone thinking\n\n"})
                in_thinking = False

            writer( {"token": chunk.message.content})  



builder = StateGraph(State)

builder.add_node("ollama", llm_node)
builder.set_entry_point("ollama")
builder.add_edge("ollama", END)

graph = builder.compile()


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json

    def generate():
        for event in graph.stream(
            {"user_prompt": data["prompt"]},
            stream_mode="custom"
        ):
            if "token" in event:
                yield event["token"]

    return Response(
        stream_with_context(generate()),
        mimetype="text/plain"
    )

'''read for better implementation of streaming output from langgraph https://docs.langchain.com/oss/python/langgraph/streaming#full-example'''



# working
# @app.route("/chat", methods=["POST"])
# def chat():
#     data = request.json

#     def generate():
#         state = {"user_prompt": data["prompt"]}
#         for chunk in llm_node(state):   # stream directly from the node
#             yield chunk["token"]

#     return Response(
#         stream_with_context(generate()),
#         mimetype="text/plain"
#     )

if __name__ == "__main__":
    app.run(debug=True, threaded=True)