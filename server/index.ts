import {App} from './App';

let PORT: string = <string> process.env.SERVER_HTTP_PORT || "7789";



let server: App = App.bootstrap(PORT);
server.start();
