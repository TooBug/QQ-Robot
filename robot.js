/*global console*/
/*jshint node:true,strict:false*/

var helper = {};

helper.testUrl = function(str){
	var urlRegExp = /((https?:\/\/|www\.)[\w_\.\/\%\&\?\-=:#]+)/;
	return urlRegExp.test(str);
};
helper.wrapUrl = function(str,prefix,postfix){
	var urlRegExp = /((https?:\/\/|www\.)[\w_\.\/\%\&\?\-=:#]+)/g;
	return str.replace(urlRegExp,function(string,url,prefix) {
		var realUrl = url;
		if(prefix === 'www.'){
			realUrl = 'http://'+url;
		}
		return prefix + realUrl + postfix;
	});
};
helper.ajax = function(url,callback){
	var xmlhttp=new XMLHttpRequest();
	xmlhttp.onreadystatechange=function(){
		if (xmlhttp.readyState==4 && xmlhttp.status==200){
			var replyMsg = JSON.parse(xmlhttp.responseText);
			if(replyMsg.code >= 100000){
				var msg = replyMsg.text;
				if(replyMsg.url){
					msg += replyMsg.url;
				}
				callback(msg);
			}
		}
	};
	xmlhttp.open('GET',url,true);
	xmlhttp.send(null);
};

helper.fs = {};

helper.fs.setLogFolder = function(folderName){
	this._folder = folderName;
	var fs = require('fs');
	if(!fs.existsSync(this._folder)){
		fs.mkdirSync(this._folder);
	}
};

helper.fs.getCurrentFileName = function(){
	var today = new Date();
	var path = require('path');
	return path.join(this._folder,today.getFullYear() + '-' + (today.getMonth()+1) + '.md');
};

helper.fs.writeLine = function(content){
	var currentFile = this.getCurrentFileName();
	var fs = require('fs');
	fs.appendFileSync(currentFile,content.replace(/\n/g,' ')+'\n');
};


helper.fs.deleteLastLine = function(content){
	var currentFile = this.getCurrentFileName();
	// todo
};

helper.fs.searchLinesInFile = function(file,keywords){
	var fs = require('fs');
	var allLines = fs.readFileSync(file).split('\n');
	var ret = allLines.filter(function(fileLine){
		return keywords.every(function(keyword){
			return fileLine.toLowerCase().indexOf(keyword.toLowerCase()) > -1;
		});
	});
	return ret;
};

var robot = {};

robot.init = function(){
	this._selfUid = '1465013279';
	this._lastIndex = -1;
	helper.fs.setLogFolder('./logs');
	window.addEventListener('load',function(){
		robot.run();
	});
};

robot.parseMessage = function(content, nick, uid){
	var keywords = [
		'@toosolo','@聊天','@天气',
		'@闭嘴','@no-toosolo','@no_toosolo','@no','@shut',
		'@福利','@分享','@share',
		'@历史','@记录','@history',
		'@撤回','@撤销'
	];
	var command;
	if(helper.testUrl(content)){
		command = '福利';
	}else{
		keywords.forEach(function(keyword){
			if(content.toLowerCase().indexOf(keyword) > -1){
				command = keyword.substr(1);
			}
		});
	}
	var ret;
	if(command){
		ret = {
			content:content.replace('@' + command,'').trim(),
			command:command,
			nick:nick,
			uid:uid
		};
	}
	return ret;
};

robot.replyMessage = function(message){
	if(!message) return;
	var messageInput = robot._qqDoc && robot._qqDoc.querySelector('#chat_textarea');
	var sendBtn = robot._qqDoc && robot._qqDoc.querySelector('#send_chat_btn');

	robot.commands[message.command](message.content,message.nick,message.uid,function(msg){
		messageInput.value = msg;
		setTimeout(function(){
			sendBtn.click();
		},100);
	});
};

robot.run = function(){
	console.log('robot.run()');
	setInterval(robot.check,1000);
};

robot.check = function(){
	console.log('robot.check()');
	if(!robot._qqDoc){
		robot._qqDoc = document.querySelector('iframe').contentDocument;
	}else{
		var msgDom = robot._qqDoc.querySelectorAll('.chat_content_group');
		for(var i = robot._lastIndex + 1; i < msgDom.length; i++){
			
			var content = msgDom[i].querySelector('.chat_content').innerText;
			var nick = msgDom[i].querySelector('.chat_nick').innerText;
			var uid = msgDom[i].getAttribute('_sender_uin');
			
			robot._lastIndex = i;

			var parseResult = robot.parseMessage(content,nick,uid);

			robot.replyMessage(parseResult);
		}
	}

};

robot.commands = {};

robot.commands.聊天 = function(content,nick,uid,callback){
	var url = 'http://www.tuling123.com/openapi/api?key=' +
		window.apikey + '&userid=' + encodeURI(uid) +
		'&info='+encodeURI(content);
	helper.ajax(url,function(msg){
		callback(msg);
	});
};
robot.commands.toosolo = robot.commands.聊天;
robot.commands.天气 = function(content,nick,uid,callback){
	robot.commands.聊天(content+'天气',nick,uid,callback);
};

robot.commands.福利 = function(content,nick,uid,callback){
	var logContent = '';
	if(/#每日福利#/.test(content)){
		logContent = '【每日福利】';
	}
	logContent += helper.wrapUrl(content,'<','>');
	helper.fs.writeLine(logContent);
	setTimeout(function(){
		callback('@' + nick + '，刚分享的福利已记录。');
	},0);
};
robot.commands.分享 = robot.commands.福利;
robot.commands.share = robot.commands.福利;

robot.commands.闭嘴 = function(content,nick,uid,callback){
	setTimeout(function(){
		callback('我就看看，闭嘴就闭嘴……');
	},0);
};
robot.commands.shut = robot.commands.闭嘴;
robot.commands.no = robot.commands.闭嘴;
robot.commands['no-toosolo'] = robot.commands.闭嘴;
robot.commands.no_toosolo = robot.commands.闭嘴;

robot.commands.历史 = function(content,nick,uid,callback){
	//readAllOldFiles(title,new Date().getTime());
		
		/*var fs,searchfile,alreadyRead,checkFinished;
		var files = [];
		var bkcontent = '查询结果:\n';
		alreadyRead = 1;
		fs = require('fs');
		fs.readdir('./daily-welfare', function(err, fd) {
			if(err) return;
			for (var file in fd) {
				if (helper.getRegExp('.md$','').test(fd[file])){
					files.push(fd[file]);
					searchfile(fd[file],title);
				}
		  }
		});
		searchfile = function(name,title) {
			title = title.trim().split(',');
			fs.readFile('./daily-welfare/'+name,function(err,data){
				var lines = data.toString().split('\n');
				lines.forEach(function(line){
					if (line[0] == '-') {
						var keywordsCount = 0;
						title.forEach(function(titleItem){
							if (line.toLowerCase().indexOf(titleItem) > -1) {
								keywordsCount++;
							}
						});
						if (keywordsCount === title.length) {
							bkcontent += line.replace('- [','').replace('](','\n').replace(')','')+'\n';
						}
					}
				});
				alreadyRead++;
				checkFinished();
			});
		};
		checkFinished = function() {
			if (alreadyRead === files.length) {
				reply(bkcontent);
				console.log(new Date().getTime()-time);
			}
		};*/
};
robot.commands.记录 = robot.commands.历史;
robot.commands.history = robot.commands.历史;

robot.commands.撤回 = function(content,nick,uid,callback){

};
robot.commands.撤销 = robot.commands.撤回;

robot.init();

