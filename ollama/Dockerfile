FROM ollama/ollama:latest

RUN (ollama serve &) && sleep 5 && ollama pull llama3.2:1b && pkill ollama

EXPOSE 11434
ENTRYPOINT []
CMD ["sh", "-c", "OLLAMA_HOST=0.0.0.0:${PORT:-11434} exec ollama serve"]