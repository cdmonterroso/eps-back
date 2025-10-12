#FROM node:20-alpine
FROM node:20.16.0-alpine

# Se le indica a todo el archivo dockerfile que la carpeta de trabajo será la de WORKDIR
#WORKDIR /myBack
WORKDIR /usr/src/app

# Colocando /myBack o . es equivalente
#COPY package.json .
COPY package.json package-lock.json ./  

RUN npm install

# copiando el resto de archivos del proyecto /back
# source dest
COPY . .

# EXPOSE 3000
EXPOSE 3000

#CMD npm start
CMD [ "npm", "start" ]

#CONSTRUIR IMAGEN  : docker build -t node_ddo .
#El . indica que el dockerfile está en la ruta actual, sin necsidad de ir a otra carpeta