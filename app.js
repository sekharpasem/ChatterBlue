var express=require('express');
var app=express();
var server=require('http').createServer(app);	
var io=require('socket.io')(server);
var redis=require('redis');
var redisClient=redis.createClient(process.env.REDIS_URL);


io.on('connection',function(client){
 console.log('client connected');

 	client.on('join',function(name){
		 client.nickname=name;

		 //emiting chatter name tp all clients
		 client.broadcast.emit('add chatter',name);

		 //emit the all current chatters t newly connected client
		 redisClient.smembers('chatters',function(err,names){
		 	names.forEach(function(name){
		 		client.emit('add chatter',name);
		 	});
		 });


		 redisClient.sadd('chatters',name);

		 //emit all the messages till now chatted to joined client
		 redisClient.lrange('messages',0,-1,function(err,messages){
		 	//reverse so they are emitted in correct order
		 	messages=messages.reverse();

		 	messages.forEach(function(message){
		 		//parse into json obj
		 		message=JSON.parse(message);
		 		client.emit('messages',message.name+": "+message.data);

		 	})
		 });
	 });

	 client.on('messages',function(message){
	 	var nickname=client.nickname;

	 	//To All clients
		 client.broadcast.emit('messages',nickname+": "+message);

		 //The current client or invoked one
		  client.emit('messages',nickname+": "+message);
		  storeMessage(nickname,message);	
	 });

	 client.on('disconnect',function(){

	 		var nickname=client.nickname;
	 		client.broadcast.emit('remove chatter',nickname);
	 		redisClient.srem('chatters',nickname);
	 	
	 });
});

app.get('/',function(req,res){
  res.sendFile(__dirname+'/index.html');
});

var storeMessage=function(name,data){
	var message=JSON.stringify({name:name,data:data});
	//store message and data in redis with key 'messages'
	redisClient.lpush('messages',message,function(err,response){
	redisClient.ltrim('messages',0,9); //newest 10 items
	});
}



server.listen(8080);