import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AdminState {
  newCharityName: string = '';
  newCharityDesc: string = '';
}