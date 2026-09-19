import os
import json
import inspect
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    async def generate_tool_response(self, prompt: str, tools: list) -> dict:
        """
        Generate a response using the LLM provider, with function calling support.
        Returns a dict: {"text": "final response", "executed_tools": [...]}
        """
        pass

class GeminiProvider(LLMProvider):
    def __init__(self):
        from google import genai
        self.client = genai.Client()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    async def generate_tool_response(self, prompt: str, tools: list) -> dict:
        from google.genai import types
        
        tools_dict = {t.__name__: t for t in tools}
        executed_tools = []

        chat = self.client.aio.chats.create(
            model=self.model_name,
            config=types.GenerateContentConfig(
                tools=tools,
                temperature=0.0
            )
        )
        
        response = await chat.send_message(prompt)
        
        # Continuously process tool calls until the model returns a final text response
        while response.function_calls:
            for call in response.function_calls:
                func = tools_dict.get(call.name)
                if func:
                    # Convert arguments and record the executed tool
                    args = call.args if isinstance(call.args, dict) else dict(call.args)
                    executed_tools.append({"name": call.name, "args": args})
                    
                    try:
                        result = func(**args)
                    except Exception as e:
                        result = str(e)
                    
                    # Send the function execution result back to the model
                    response = await chat.send_message(
                        types.Part.from_function_response(
                            name=call.name,
                            response={"result": result}
                        )
                    )
        
        return {
            "text": response.text,
            "executed_tools": executed_tools
        }

class OpenAICompatibleProvider(LLMProvider):
    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "dummy"),
            base_url=os.getenv("OPENAI_BASE_URL")
        )
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def generate_tool_response(self, prompt: str, tools: list) -> dict:
        tools_dict = {t.__name__: t for t in tools}
        
        # Convert python functions into OpenAI tool schemas dynamically
        openai_tools = []
        for t in tools:
            sig = inspect.signature(t)
            properties = {}
            required = []
            for name, param in sig.parameters.items():
                properties[name] = {"type": "string"}
                if param.default == inspect.Parameter.empty:
                    required.append(name)
                    
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": t.__name__,
                    "description": t.__doc__ or "",
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required
                    }
                }
            })
            
        messages = [{"role": "user", "content": prompt}]
        executed_tools = []
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            tools=openai_tools
        )
        
        msg = response.choices[0].message
        
        while msg.tool_calls:
            messages.append(msg)
            for call in msg.tool_calls:
                func = tools_dict.get(call.function.name)
                if func:
                    args = json.loads(call.function.arguments)
                    executed_tools.append({"name": call.function.name, "args": args})
                    try:
                        result = func(**args)
                    except Exception as e:
                        result = str(e)
                        
                    messages.append({
                        "role": "tool",
                        "tool_call_id": call.id,
                        "name": call.function.name,
                        "content": str(result)
                    })
            
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                tools=openai_tools
            )
            msg = response.choices[0].message
            
        return {
            "text": msg.content,
            "executed_tools": executed_tools
        }

def get_llm_provider() -> LLMProvider:
    backend = os.getenv("LLM_BACKEND", "gemini").lower()
    if backend == "openai":
        return OpenAICompatibleProvider()
    elif backend == "gemini":
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown LLM_BACKEND: {backend}")
