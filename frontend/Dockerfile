FROM node:20-alpine

WORKDIR /app

# We don't copy package.json and run npm install here because we use volume mounting 
# and want to support rapid local development with hot reloading.
# In a real production Dockerfile, you would copy files, install, and build.

EXPOSE 3000
CMD ["npm", "run", "dev"]
