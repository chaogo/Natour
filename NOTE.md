- fat models (to react with data), thin controllers (execution functions)
- REST API: Representational state transfer
- JWT: Json web token
- the last element in a json doc does not end with comma
- cookie: is basically a small piece of text that a server can send to clients. when the client receives a cookie, it will automatically store it and then automatically send it back along with all future requests to the same server
- Data modeling: real-world scenario -> unstructured data -> structured, logical data model
- Populate & Virtual Populate:
- factory function: an function that returns another function
- server-side ( build the website {the actual html} on the server: whenever there is a request (e.g. homepage), we then get the necessary data from the database, inject it into a template, which will then output html and finally send that html along wiht CSS and JavaScript and image file back to the client ) & client-side rendering (only send the json data to the client side by API)
- buffered code & unbuffered code
- we can specify a data attribute in HTML and then read that attribute using JavaScipt

- AJAX, axios(an http client library), cdnjs, "what happend when you enter and click a url on browser?"

- bundle tool (webpack, parcel) : is a module bundler that packages all our app assets into a production-ready bundle. It does this by bundling all our app’s scripts into one file. And as a result, it minimizes HTTP requests and speeds up the site’s performance. Also, it helps us to load our app modules and their dependencies and handles different definitions and browser compatibility out of the box. 这部分“前端代码”在写的时候不可能写成一个文件（开发不友好），但要 client 执行的话需要所有文件，不能一边运行一边发 http 请求这个文件（浏览器不能识别且 http 请求慢），所以就需要把所有代码打包好，通过一次 http 请求取得这个打包好的文件，浏览器直接处理这一个文件就好。另外浏览器端还会拆包（还原）成开发文件们，方便浏览器调试

- why not store the images in the dataBase like mongoDB?
