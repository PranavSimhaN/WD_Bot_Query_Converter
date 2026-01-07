FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip
RUN pip3 install neo4j groq langchain-neo4j langchain-groq python-dotenv --break-system-packages
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3001
CMD ["node","server.js"]
