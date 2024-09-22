const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const cors = require('cors');

// jwt related things
const {secureRoute, jwtDecodeOptions} = require("./src/config/jwt-config");
const jwt = require("jsonwebtoken");

// env vars
require('dotenv').config()

// web socket
const ws = require("socket.io");
const HttpError = require("./src/models/HttpError");

// will create express server
const app = express();

// and get the httpServer of it
const httpServer = http.createServer(app);

// socket io object
const io = ws(httpServer)

module.exports.io = io;

const interestRoutes = require("./src/routes/interest-routes");

const userRoutes = require("./src/routes/user-routes");

const friendshipRoutes = require("./src/routes/friendship-routes");

const privateChatRoutes = require("./src/routes/private-chat-routes");

const groupRoutes = require("./src/routes/group-routes");

// // just for testing
// const {fileURLToPath} = require("url");
// const {dirname, join} = require("path");

// // let's test rest and socket both

// // rest test
// app.get("/test", (req, res)=>
// {
//     res.end("This is test");
// });


// // socket test
// const __currdirname = process.cwd();

// app.get('/', (req, res) => {
//   res.sendFile(join(__currdirname, 'index.html'));
// });

// io.on('connection', (socket)=>
// {
//     console.log("user connected");
// })

// authentication for web socket connectionds
io.engine.use((req, res, next) =>
{
    // is it a handshake request?
    const isHandshake = req._query.sid === undefined;
    if (isHandshake)
    {
        // yes, it is handshake request, authenticate it
        secureRoute(req, res, next);
    }
    else
    {
        // not a handshake request, proceed
        next();
    }
});

io.on("connection", (socket)=>
{
    // a new connection
    // get the user
    const user = socket.request.user;
    // put the user in his room
    socket.join(`user:${user._id}`);
});

// cors config
app.use(cors());

// middleware to convert body of all requests to json if exist
app.use(express.json());

// test endpoints to test jwt

// to get secured data
app.get(
    "/self",
    secureRoute,
    (req, res)=>
    {
        
        console.log("executing the controller method")
        
        // auth success
        res.send(req.user);
        
    }
);

// to get jwt
// is there in userRoutes

// routes for interests
app.use("/api/interests", interestRoutes);

// routes for users
app.use("/api/users", userRoutes);

// routes for friendship requests
app.use("/api/friendship-requests", friendshipRoutes);

// routes for private chat
app.use("/api/private-chats", privateChatRoutes);

// routes for groups
app.use("/api/groups", groupRoutes);

// route not matching
app.use((req, res, next) => {
    const error = new HttpError("Could not find this route.", 404);
    return next(error);
});

// to send errors
app.use((error, req, res, next) =>
{
    if (res.headerSent)
    {
        return next(error);
    }
    res.status(error.code || 500);
    res.json({ message: error.message || "An unknown error occurred!" });
});

// connect to database and then make the server listen
mongoose
.connect(process.env.MONGODB_CONNECTION)
.then(()=>
{
    httpServer.listen(3000, ()=>
    {
        console.log("server listening at 3000");
    })
})
.catch((err)=>
{
    console.log(err);
})