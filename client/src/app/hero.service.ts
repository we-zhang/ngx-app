import { Injectable } from "@angular/core";
import { HEROES } from  "./mock-heroes";
import { Hero } from "./hero";
import { Observable } from "rxjs/Observable";

@Injectable()
export class HeroService {
    getHeros(): Observable<Hero[]> {
        return Observable.create(observer => {
            observer.next(HEROES);
        })
    }

    getHero(id): Observable<Hero> {
        return Observable.create(observer => {
            HEROES.forEach( data => {
                if (data.id === id) {
                     observer.next(data);
                }
            })
        })
    }
}