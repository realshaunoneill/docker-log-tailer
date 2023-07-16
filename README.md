# Docker Log Tailer  :whale:
[![Docker Image CI](https://github.com/realshaunoneill/docker-log-tailer/actions/workflows/docker-image.yml/badge.svg)](https://github.com/realshaunoneill/docker-log-tailer/actions/workflows/docker-image.yml)
[![Github Source](https://img.shields.io/badge/source-github-orange)](https://github.com/realshaunoneill/cloudflare-ddns)
[![Docker Image Size](https://img.shields.io/docker/image-size/realshaunoneill/docker-log-tailer/latest)](https://hub.docker.com/r/realshaunoneill/docker-log-tailer)
[![DockerHub Pulls](https://img.shields.io/docker/pulls/realshaunoneill/docker-log-tailer)](https://hub.docker.com/r/realshaunoneill/docker-log-tailer 'DockerHub pulls')

A simple script that listens to standard output logs of all Docker containers and sends them to 🚀 Rapid7 Log Search for centralized log management and analysis. This allows you to easily search and analyze your container logs in one place.

⚠️ **This Repository is Not Official** ⚠️
Please note that this repository is not an official project or affiliated with Rapid7. It is a community-driven effort that aims to provide the ability to easily send docker logs to log search. While every effort has been made to ensure the accuracy and reliability of the content in this repository, please be aware that it may not reflect official guidelines, specifications, or support.

## ✨ Features
Automatically collects standard output logs from Docker containers
Sends logs to Rapid7 Log Search for centralized log management
Easy setup and configuration
⚙️ Prerequisites
- Docker Engine installed and running
- Docker Compose (optional, for running the example setup)
- Rapid7 Log Search account (sign up at https://www.rapid7.com/products/insight-platform/log-search/)

## ⚙️ Prerequisites
- Docker Engine installed and running
- Docker Compose (optional, for running the example setup)
- Rapid7 Log Search account (sign up at https://www.rapid7.com/products/insight-platform/log-search/)

## 🔧 Configuration
You can modify the following configuration settings in the .env file:

- HOSTNAME: This is the hostname for the server that is running the service. It is used to identify the server in the logs.
- API_KEY: This is your Rapid7 Log Search API key. You can find it in the Log Search UI under Settings > API Keys.
- LOG_REGION: This is the region where your Rapid7 Log Search account is hosted.
- DOCKER_PATH: This is the path to the Docker socket. It is used to listen to Docker events. You can leave this as the default value unless you have a custom Docker socket path.

## Installation :computer:
There are two ways to run this service: using Docker or Node.js. The Docker image is recommended for most users, but if you want to run the service on a machine that doesn't have Docker installed, you can use Node.js instead.
### Using Docker :whale:
1. Create a new file called docker-compose.yml and copy the following contents into it:

   ```yaml
   version: "3.8"
   services:
     cloudflare-ddns:
       image: realshaunoneill/cloudflare-ddns:latest
       container_name: cloudflare-ddns
       restart: unless-stopped
       environment:
         - HOSTNAME=
         - API_KEY=
         - LOG_REGION=
   ```
2. Modify the environment variables to your liking. See Configuration for more information.
3. Run the service:

   ```shell
   docker-compose up -d
   ```
### Using Node.js :computer:
1. Clone this repository to your local machine:

   ```shell
   git clone git@github.com:realshaunoneill/docker-log-tailer.git
   ```
2. Install the dependencies:

   ```shell
   npm install
   ```
3. Copy the .env.example file to .env and modify the values to your liking. See Configuration for more information.
The .env file is used to store your Cloudflare API key and other configuration options. It is ignored by Git, so you don't have to worry about accidentally committing your API key to the repository. You can copy the .env.example file to .env using the following command:

   ```shell
   cp .env.example .env
   ```
4. Run the service:

   ```shell
   npm start
   ```
5. (Optional) If you want to run the service in the background, you can use a process manager like [PM2](https://pm2.keymetrics.io/):

   ```shell
   npm install pm2 -g
   pm2 start index.js --name cloudflare-ddns
   ```

## 🤝 Contributing
Contributions are welcome! If you find any issues or have suggestions, please open an issue or submit a pull request.

## 📝 License
This project is licensed under the GPL-3.0 License. See the LICENSE file for details.