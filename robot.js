/*global console*/
/*jshint node:true,strict:false*/

var helper = {};

helper.testUrl = function(str){
	var urlRegExp = /((https?:\/\/|www\.)[\w_\.\/\%\&\?\-=:#]+)/;
	return urlRegExp.test(str);
};
helper.wrapUrl = function(str,prefix,postfix){
	var urlRegExp = /((https?:\/\/|www\.)[\w_\.\/\%\&\?\-=:#]+)/g;
	return str.replace(urlRegExp,function(string,url,urlPrefix) {
		var realUrl = url;
		if(urlPrefix === 'www.'){
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
	var year = today.getFullYear();
	var month = today.getMonth() + 1;
	var path = require('path');
	return path.join(this._folder,year + (month < 10?'0':'') + month + '.md');
};

helper.fs.writeLine = function(content){
	var currentFile = this.getCurrentFileName();
	var fs = require('fs');
	fs.appendFileSync(currentFile,content.replace(/\n/g,' ')+'\n');
};

helper.fs.getAllFiles = function(){
	var fs = require('fs');
	var path = require('path');
	var allFiles = fs.readdirSync(helper.fs._folder);
	return allFiles.filter(function(file){
		return /\.md$/.test(file) && fs.statSync(path.join(helper.fs._folder,file)).isFile();
	});
};

helper.fs.deleteLastLine = function(content){
	var currentFile = this.getCurrentFileName();
	// todo
};

helper.fs.searchLinesInFile = function(file,keywords){
	var fs = require('fs');
	var path = require('path');
	var allLines = fs.readFileSync(path.join(helper.fs._folder,file),'utf-8').split('\n');
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
	setInterval(robot.check,1000);
};

robot.check = function(){
	if(!robot._qqDoc){
		robot._qqDoc = document.querySelector('iframe').contentDocument;
	}else{
		var msgDom = robot._qqDoc.querySelectorAll('.chat_content_group');
		for(var i = robot._lastIndex + 1; i < msgDom.length; i++){
			
			var content = msgDom[i].querySelector('.chat_content').innerText;
			var nick = msgDom[i].querySelector('.chat_nick').innerText;
			var uid = msgDom[i].getAttribute('_sender_uin');
			
			robot._lastIndex = i;

			if(uid === robot._selfUid) return;

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
		callback('@' + 'nick ' + msg);
	});
};
robot.commands.toosolo = robot.commands.聊天;
robot.commands.天气 = function(content,nick,uid,callback){
	robot.commands.聊天(content+'天气',nick,uid,callback);
};

robot.commands.福利 = function(content,nick,uid,callback){
	var logContent = nick + '(' + uid + '):';
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

	var allFiles = helper.fs.getAllFiles();
	var ret = ['每日福利历史记录搜索结果：'];
	allFiles.forEach(function(file){
		ret = ret.concat(helper.fs.searchLinesInFile(file,content.split(',')));
	});	
	callback(ret.join('\n'));
};
robot.commands.记录 = robot.commands.历史;
robot.commands.history = robot.commands.历史;

robot.commands.撤回 = function(content,nick,uid,callback){

};
robot.commands.撤销 = robot.commands.撤回;

robot.init();


