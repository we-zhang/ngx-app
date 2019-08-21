import {App} from './App';

let PORT: string = <string> process.env.WISTUDIO_SERVER_HTTP_PORT || "7747";



let server: App = App.bootstrap(PORT);
server.start();
