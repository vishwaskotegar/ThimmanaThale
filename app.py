from flask import Flask, jsonify, request, Response, stream_with_context
import ollama

from embeddings_service import embed_image_png, embed_text
from qdrant_webpage import upsert_webpage_image, upsert_webpage_text
from readWebpage import read_webpage

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "Hello, World!"

@app.route("/ingest-webpage", methods=["POST"])
def ingest_webpage():
    """
    Accept JSON ``{"url": "https://..."}``, fetch page text + screenshot,
    embed text (Sentence Transformers) and image (OpenCLIP), upsert into two Qdrant collections.
    """
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "Missing or empty \"url\" in JSON body"}), 400

    try:
        capture = read_webpage(url)
    except TimeoutError as e:
        return jsonify({"error": str(e), "url": url}), 504
    except Exception as e:
        return jsonify({"error": f"Failed to load page: {e}", "url": url}), 502

    result = {
        "url": capture.url,
        "title": capture.title,
        "text_char_count": len(capture.text),
        "screenshot_bytes": len(capture.screenshot_png),
        "text_point_id": None,
        "image_point_id": None,
        "text_skipped": False,
    }

    # 1) Image branch → OpenCLIP → Qdrant (image collection) first so it succeeds even if text fails
    try:
        image_vec = embed_image_png(capture.screenshot_png)
        result["image_point_id"] = upsert_webpage_image(
            capture.url,
            image_vec,
            title=capture.title,
        )
    except Exception as e:
        return jsonify({**result, "error": f"Image embed / Qdrant failed: {e}"}), 500

    # 2) Text branch → Sentence Transformers → Qdrant (text collection)
    if capture.text:
        try:
            text_vec = embed_text(capture.text)
            result["text_point_id"] = upsert_webpage_text(
                capture.url,
                capture.text,
                text_vec,
                title=capture.title,
            )
        except Exception as e:
            return jsonify({**result, "error": f"Text embed / Qdrant failed: {e}"}), 500
    else:
        result["text_skipped"] = True

    return jsonify(result), 200


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