<script>
	export let name;
	let username = '';
	let counter = 0;
	let numUsers=0;
	let messages = [];
	let to_users = [];
	let from_users = [];
	let myNamelist =[]
	let inputText = "";
	let myName = ''
	const ws = new WebSocket("ws://localhost:6789");

	ws.onopen = function(){
		console.log('Websocket Client Connected');
	};

	ws.onmessage = function(e) {
		let data = JSON.parse(e.data)
		console.log("Received:" + e.data);

		if(data.type == 'message'){
			counter = counter+1
			messages = [...messages, data.message_text];
			to_users = [...to_users, data.to_user_name];
			from_users = [... from_users, data.from_user_name]


			inputText = ""
		}
		else if(data.type =='users'){
			numUsers = data.count;
		}
		else{
			console.error("unsupported event", data);
		}
	};

	function handleClick(){
		if(inputText.startsWith('/name ')){
			ws.send(JSON.stringify({'chat_message':inputText.slice(6), 'to_user_name':'all', 'name_alter':'True', 'private':'False', 'normal':'False'}));
		}
		else if(inputText.startsWith('/to ')){
			var temp = inputText.split(' ')
			var temp_number = temp[1].length 
			ws.send(JSON.stringify({'chat_message':inputText.slice(4+temp_number), 'to_user_name':temp[1], 'name_alter':'False', 'private':'True', 'normal':'False'}));
		}
		else if (myName != null){
			ws.send(JSON.stringify({'chat_message':inputText, 'to_user_name':'all', 'name_alter':'False','private':'False', 'normal':'True'}));
		}
		else {
			console.error("unsupported event", data);
		}
	}	
</script>

<main>
	<h1>Olá a todos {name}!</h1>
	
	<form>
		<h2> Send message:</h2>
		<input type="text" bind:value={inputText}/>
		<button type='submit' on:click|preventDefault={handleClick}> Send</button>
	</form>

	<h3> Received Message: </h3>
	{#if counter>0}
		{#each messages as message, i}
			<p>From({from_users[i]}) to ({to_users[i]}) -----: {message} </p>
		{/each}
	{/if}
	<div class="buttons">
		<div class="value">{counter}</div>
	</div>
	<div class="state">
	<span class="users">{numUsers} {numUsers > 1 ? 'users':'user'}</span> online
	</div>
	
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	.buttons {
                font-size: 4em;
                display: flex;
                justify-content: center;
            }
            .button, .value {
                line-height: 1;
                padding: 2rem;
                margin: 2rem;
                border: medium solid;
                min-height: 1em;
                min-width: 1em;
            }
            .button {
                cursor: pointer;
                user-select: none;
            }
            .minus {
                color: red;
            }
            .plus {
                color: green;
            }
            .value {
                min-width: 2em;
            }
            .state {
                font-size: 2em;
            }
</style>