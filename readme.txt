created with anaconda python 3.10 
activte env : conda activate ./env

pip install ollama 
ollama run qwen3:8b

Curl Command to invoke chat : 
curl -N -X POST http://127.0.0.1:5000/chat -H "Content-Type: application/json" -d "{\"prompt\":\"what is 3^3?\"}"

unable to get streaming response in postman 

curl --no-buffer -X POST http://localhost:5000/chat -H "Content-Type: application/json" -d "{\"message\":\"hello\"}"

Run test.py for langgraph implementation: 
python test.py 

curl --no-buffer http://localhost:5000/chat -H "Content-Type: application/json" -d "{\"prompt\":\"hello\"}"