import * as path from 'path';
import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';

import * as indexRoute from "./routes/index";

// Creates and configures an ExpressJS web server.
export class App {

  // ref to Express instance
  public express: express.Application;

  //Run configuration methods on the Express instance.
  constructor(private port: string, private dist_dir: string) {
    this.express = express();
    this.middleware();
    this.routes(dist_dir);
  }

 public static bootstrap(port: string): App {
    return new App(port, path.join(__dirname, "..", "client"));
  }

  // Configure Express middleware.
  private middleware(): void {
    this.express.use(logger('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
  }

  public start() {
    this.express.listen(this.port, () => {
        console.log( "Server started at http://localhost:" + this.port);
    });
  }

  // Configure API endpoints.
  private routes(dist_dir): void {
    
    console.log("&&& dist" + dist_dir);
    this.express.use(express.static(dist_dir))

    // /* This is just to get up and running, and to make sure what we've got is
    //  * working so far. This function will change when we start to add more
    //  * API endpoints */
    // let router = express.Router();


    // let index: indexRoute.Index = new indexRoute.Index();

    // // home page
    // router.get("/", index.index.bind(index.index));
  }

}