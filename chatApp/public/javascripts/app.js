// console.logCopy = console.log.bind(console);

// console.log = function(data)
// {	//method to add timestamps to log output
//     var currentDate = '[' + new Date().toUTCString() + '] ';
//     this.logCopy(currentDate, data);
// };

function querystring(key) {
   var re=new RegExp('(?:\\?|&)'+key+'=(.*?)(?=&|$)','gi');
   var r=[], m;
   while ((m=re.exec(document.location.search)) != null) r.push(m[1]);
   return r;
}

function orderSort(a,b) {
   return ($(a).attr('order') > $(b).attr('order')) ? 1 : -1;
}

window.createLayout = (function ($) {
	return function () {
		var server = null;
		var scanId;
		var heartbeatId;
		var myIpAddress = $('#hdnIP').attr('ipaddress');
		var username = querystring('username')[0];

		var msgShowListDevices = false;

		var theLayout = {
			init: function (host){
				server = io.connect(host || location.host);   //using routes meant location.href no longer worked correctly
				server.on('connect', theLayout.events.onConnect);
				server.on('disconnect', theLayout.events.onDisconnect);
				server.on('message', theLayout.events.onClientMessage);
				server.on('error', theLayout.events.onServerError);

				$('#message').keyup(function (e) {
					if (e.keyCode === 13) { theLayout.events.onTextboxEnter.apply(this, arguments); }
				}).focus();
				$('#sendButton').click(function() {
					theLayout.events.onSendButtonClick.apply(this, arguments);
				});
				$('#scan').click(function() {
					theLayout.events.onScanButtonClick.apply(this, arguments);
				});
				$('#mnuMsg').click(function() {
					theLayout.menu.showGameBoard.apply(this, arguments);
				});
				$('#mnuStatus').click(function() {
					theLayout.menu.showStatus.apply(this, arguments);
				});
				$('#mnuHistory').click(function() {
					theLayout.menu.showHistory.apply(this, arguments);
				});

				theLayout.views.buildChatPanel();
				theLayout.views.buildStatusHolder();
				theLayout.views.buildHistoryHolder();

				theLayout.menu.buildChatPanel();  //default view
			},
			views: {
				error: function (msg) {
					var currentDate = '[' + new Date().toUTCString() + '] ';
					return $('<div></div>').addClass('error-message').html(currentDate + msg);
				},
				warn: function (msg) {
					var currentDate = '[' + new Date().toUTCString() + '] ';
					return $('<div></div>').addClass('warn-message').html(currentDate + msg);
				},
				message: function (msg) {
					var currentDate = '[' + new Date().toUTCString() + '] ';
					return $('<div></div>').addClass('client-message').html(currentDate + msg);
				},
				player: function (peep, location) {
					var newId = peep.deviceId.replace(/:\s*/g, "");
					var container = $('<div></div>').attr('id', newId).attr('type', 'peep').addClass('item').attr('timestamp', Math.round((new Date()).getTime() / 1000));
					var avatar = $('<img></img>').addClass('avatar').attr('src', peep.avatar);
					var who = $('<span></span>').addClass('name').html(peep.name + ' <i>' + peep.deviceId + '</i>');
					var where = $('<p></p>').addClass('location').html($('<span></span>').addClass('location').html(location));
					var when = $('<span></span>').addClass('time').html(new Date().toUTCString());
					return(container.append(avatar).append(who).append(where).append(when));
				},
				buildChatPanel: function() {
					return;
				},
				buildStatusHolder: function () {
					return;
				},
				resetMapItem: function (item, type) {
					var x = $('td[name*=' + item + ']');
					x.removeClass().html(x.attr('id'));
				},
				warnMapItem: function (item) {
					var x = $('td[name*=' + item + ']');
					x.removeClass().addClass('beaconWarn');
				},
				errorMapItem: function (item) {
					var x = $('td[name*=' + item + ']');
					x.removeClass().addClass('beaconError');
				},
				buildHistoryHolder: function () {
					return;
				}
			},
			server: {
				sendMessage: function (data) {
					server.emit('message', {
						user: username,
						toUser: data.toUser,
						responseTo: data.responseTo,
						message: data.message,
						duration: data.duration,
						type: data.type,
						timestamp: new Date().getTime()
					})
				},
				sendHeartBeat: function () {
					theLayout.server.sendMessage({
						message: 'heartbeat',
						type: 'browser',
						ipaddress: myIpAddress
					});
				}
			},
			dom: {
				appendError: function (msg) {
					var history = $('#chat-history');
					var message = theLayout.views.error(msg).hide();
					history.append(message.fadeIn());
					history.find('.client-message:even').addClass('even');

					theLayout.controls.scrollHistoryDown();

					return message;
				},
				appendWarning: function (msg) {
					var history = $('#chat-history');
					var message = theLayout.views.warn(msg).hide();
					history.append(message.fadeIn());
					history.find('.client-message:even').addClass('even');

					theLayout.controls.scrollHistoryDown();

					return message;
				},
				appendMessage: function (msg) {
					var history = $('#chat-history');
					var message = theLayout.views.message(msg).hide();
					history.append(message.fadeIn());
					history.find('.client-message:even').addClass('even');

					theLayout.controls.scrollHistoryDown();

					return message;
				},
				startScanning: function () {
					var intv = (+$('#duration').val() + 1) * 1000

					scanId = setInterval(function() {
						$('#broadcast').fadeIn('slow', function(){
							$('#broadcast').fadeOut('slow');
						});
						theLayout.server.sendMessage({
							user: username,
							toUser: '*',
							message: 'list-devices',
							duration: $('#duration').val()
						});
					}, intv);
				},
				stopScanning: function () {
					clearInterval(scanId);
				},
				identifyUsers: function(devices, location) {
					$.each( peeps, function( key, value ) {
						var newId =  value.deviceId.replace(/:\s*/g, "");
						if (devices.indexOf(newId) >= 0) {
							var people = $('#people');
							if ($('#' + newId).length == 0) {
								var display = theLayout.views.person(value, location).hide();
								people.append(display.fadeIn());
							}
							else if ($('#' + newId).length == 1) {
								$('#' + newId).attr('timestamp', Math.round((new Date()).getTime() / 1000)).fadeTo('fast', 1);
								$('#' + newId).find($('span.time')).html(new Date().toUTCString());
								theLayout.views.buildLocationTrail(newId, location);
							}
						}
					});
				},
				checkChildren: function(container) {
					$(container).children().each(function (index) {
						var currTime = Math.round((new Date()).getTime() / 1000);
						var diff = currTime - $(this).attr('timestamp');
						if (diff <= 15 ) {
							$(this).fadeTo('fast', 1);
						}
						else if (diff > 15 && diff < 29) {
							$(this).fadeTo('slow', 0.85);
						}
						else if (diff >= 30 && diff < 44) {
							$(this).fadeTo('slow', 0.6);
						}
						else if (diff >= 45 && diff < 50) {
							$(this).fadeTo('slow', 0.4);
							if ($(this).attr('type') == 'terminal') {
								theLayout.views.warnMapItem($(this).attr('id'));
								theLayout.dom.appendWarning($(this).attr('id') + ' has not responded after ' + diff + ' seconds' );
							}
							else if ($(this).attr('type') == 'peep') {
								theLayout.dom.appendWarning($(this).find($('span.name')).html() + ' may not be within range')
							}
						}
						else if (diff >= 50 && diff < 89) {
							$(this).fadeTo('slow', 0.33);
						}
						else if (diff >= 90 && diff < 95) {
							$(this).fadeTo('slow', 0.2);
							if ($(this).attr('type') == 'terminal') {
								theLayout.views.warnMapItem($(this).attr('id'));
								theLayout.dom.appendWarning($(this).attr('id') + ' has still not responded after ' + diff + ' seconds' );
							}
							else if ($(this).attr('type') == 'peep') {
								theLayout.dom.appendWarning($(this).find($('span.name')).html() + ' still not be within range')
							}
						}
						else if (diff >= 120) {
							$(this).fadeTo('slow', 0, function() {
								$(this).slideUp(function() {
									if ($(this).attr('type') == 'terminal') {
										theLayout.dom.appendError($(this).attr('id') + ' has stopped responding');
										theLayout.views.errorMapItem($(this).attr('id'));
									}
									else if ($(this).attr('type') == 'peep') {
										theLayout.dom.appendError($(this).find($('span.name')).html() + ' is not in range');
									}
//TODO decide whether to remove items or leave in faded state.  Add status to prevent checks until reenabled
									$(this.remove());
								});
							});
						}
					});
				},
				filteredDisplay: function(msg) {
					//return false;
					console.log(msg)
					if (msg.responseTo == 'list-devices' && msgShowListDevices) {
						return true;
					}
				}
			},
			cardio: {
				ecg: function (heartbeat) {
					if ($('#' + heartbeat.user).length == 0) {
						var display = theLayout.views.drone(heartbeat).hide();
						$('#drones').append(display.fadeIn());
					}
					else if ($('#' + heartbeat.user).length == 1) {
						$('#' + heartbeat.user).attr('timestamp', Math.round((new Date()).getTime() / 1000)).fadeTo('fast', 1);
						$('#' + heartbeat.user).find($('span.beacons')).html(theLayout.views.formatBeaconList(heartbeat.beacons));
						$('#' + heartbeat.user).find($('.time')).html(new Date().toUTCString());
						if (heartbeat.bleState && heartbeat.bleState.toLowerCase() == 'poweredon') {
							$('#' + heartbeat.user).addClass('bleOn');
						}
						else {
							$('#' + heartbeat.user).removeClass('bleOn');
						}
					}

					//now update the map
					$.each( beacons, function( key, beacon ) {
						if (beacon.name == heartbeat.user) {
							$('#' + beacon.coords).html(beacon.name).removeClass().addClass('beacon').attr('name', beacon.name);
								$('#' + beacon.coords).fadeTo('fast', 1, function () {
									$('#' + beacon.coords).fadeTo('slow', 0.5);
								});
							return;
						}
					});
				}
			},
			controls: {
				scrollHistoryDown: function () {
					if ($('#chat-history').length) {
						$('#chat-history').animate({
							scrollTop: $('#chat-history').get(0).scrollHeight
						}, 50)
					}
				}
			},
			events: {
				onConnect: function () {
					$('#serverStatus').removeClass('disconnected').addClass('connected').html('Connected to host ' + location.host);
					theLayout.server.sendHeartBeat();
					heartbeatId = setInterval(function() {
						theLayout.server.sendHeartBeat();
					}, 5000);

					setInterval(function () { theLayout.dom.checkChildren('#drones'); }, 5000);
					setInterval(function () { theLayout.dom.checkChildren('#people'); }, 5000);
				},
				onDisconnect: function () {
					clearInterval(heartbeatId);
					$('#serverStatus').removeClass('connected').addClass('disconnected').html('Disconnected from host ' + location.host);
				},
				onServerError: function (err) {
					clearInterval(heartbeatId);
					console.log(err);
					$('#serverStatus').removeClass('connected').addClass('disconnected').html('Error received from host: ' + err);
				},
				onClientMessage: function (data) {
					if ($.trim(data.message).length === 0){ return; }
					if ($.trim(data.message) == 'heartbeat') {
						theLayout.cardio.ecg(data);
						return;
					}
					if ($.trim(data.message) == 'getpeople') {
						theLayout.server.sendMessage({
							toUser: data.user,
							responseTo: 'getpeople',
						 	message: peeps
						});
						return;
					}

					if (data.error) {
						theLayout.dom.appendError("From: " + data.user +
							"; ToUser: " + data.toUser +
							"; Message: " + data.message +
							"; Duration: " + data.duration);
						return;
					}

					if(data.user == "Server") {
						theLayout.dom.appendMessage(JSON.stringify(data));
						return;
					}
				},
				onTextboxEnter: function (e) {
					var value = $(this).val();
					if (value.length > 0) {
						theLayout.dom.appendMessage("From: " + username +
							"; ToUser: " + $('#toUser').val() +
							"; Message: " + value +
							"; Duration: " + $('#duration').val()).addClass('own-message');
						theLayout.server.sendMessage({
							toUser: $('#toUser').val(),
							duration: $('#duration').val(),
							message: value
						});
					}
				},
				onSendButtonClick: function (e) {
					var msg = $('#message').val();
					if (msg.length > 0) {
						theLayout.dom.appendMessage(username + ": " + msg).addClass('own-message');
						theLayout.server.sendMessage({
							toUser: $('#toUser').val(),
							duration: $('#duration').val(),
							message: msg});
					}
				}
			},
			menu: {
				showChatPanel: function (e) {
					$('#mnuChatPanel').addClass('selected');
					$('#mnuStatus').removeClass('selected');
					$('#mnuHistory').removeClass('selected');

					$('#chat-panel').show();
          $('#chat-status').hide();
					$('#chat-history').hide();
				},
				showStatus: function (e) {
					$('#mnuChatPanel').removeClass('selected');
					$('#mnuStatus').addClass('selected');
					$('#mnuHistory').removeClass('selected');

					$('#chat-panel').hide();
					$('#chat-status').show();
					$('#chat-history').hide();
				},
				showHistory: function (e) {
					$('#mnuChatPanel').removeClass('selected');
					$('#mnuStatus').removeClass('selected');
					$('#mnuHistory').addClass('selected');

					$('#chat-panel').hide();
					$('#chat-status').hide();
					$('#chat-history').show();
				}
			}
		};

		theLayout.init.apply(this, arguments);
		return theLayout;
	};
})(jQuery);

$(function () {
	var chatApp = window.createLayout('');
});
