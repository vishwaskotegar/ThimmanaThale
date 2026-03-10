created with anaconda python 3.10 
activte env : conda activate ./env

pip install ollama 
ollama run qwen3:8b

Curl Command to invoke chat : 
curl -N -X POST http://127.0.0.1:5000/chat -H "Content-Type: application/json" -d "{\"prompt\":\"hello\"}"

unable to get streaming response in postman 