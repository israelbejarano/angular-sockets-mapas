import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Lugar } from '../../interfaces/lugar';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styles: []
})
export class MapaComponent implements OnInit {

  @ViewChild('map') mapaElement: ElementRef;
  map: google.maps.Map;
  marcadores: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];

  lugares: Lugar[] = [];

  constructor(private http: HttpClient, public wsService: WebsocketService) { }

  ngOnInit() {
    this.http.get('http://localhost:5000/mapa').subscribe((lugares: Lugar[]) => {
      console.log(lugares);
      this.lugares = lugares;
      this.cargarMapa();
    });
    this.escucharSockets();
  }

  escucharSockets() {
    this.wsService.listen('nuevo-marcador').subscribe((marcador: Lugar) => {
      this.agregarMarcador(marcador);
    });

    this.wsService.listen('mover-marcador').subscribe((marcador: Lugar) => {
      for (const i in this.marcadores) {
        if (this.marcadores[i].getTitle() === marcador.id) {
          const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
          this.marcadores[i].setPosition(latLng);
          break;
        }
      }
    });

    this.wsService.listen('marcador-borrar').subscribe((id: string) => {
      for (const i in this.marcadores) {
        if (this.marcadores[i].getTitle() === id) {
          this.marcadores[i].setMap(null);
          break;
        }
      }
    });
  }

  cargarMapa() {
    const latLng = new google.maps.LatLng(37.784679, -122.395936);
    const mapaOpciones: google.maps.MapOptions = {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    this.map = new google.maps.Map(this.mapaElement.nativeElement, mapaOpciones);
    this.map.addListener('click', (coors) => {
      const nuevoMarcador: Lugar = {
        nombre: 'Nuevo lugar',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: new Date().toISOString()
      };
      this.agregarMarcador(nuevoMarcador);
      this.wsService.emit('nuevo-marcador', nuevoMarcador);
    });
    for (const lugar of this.lugares) {
      this.agregarMarcador(lugar);
    }
  }

  agregarMarcador(marcador: Lugar) {
    console.log(marcador);
    const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
    const marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng,
      draggable: true,
      title: marcador.id
    });
    this.marcadores.push(marker);
    const contenido = `<b>${marcador.nombre}</b>`;
    const infoWindow = new google.maps.InfoWindow({
      content: contenido
    });

    this.infoWindows.push(infoWindow);

    google.maps.event.addDomListener(marker, 'click', () => {
      this.infoWindows.forEach(infoW => infoW.close());
      infoWindow.open(this.map, marker);
    });
    google.maps.event.addDomListener(marker, 'dblclick', (coors: any) => {
      console.log(coors);
      marker.setMap(null);
      this.wsService.emit('marcador-borrar', marcador.id);
    });
    google.maps.event.addDomListener(marker, 'drag', (coors: any) => {
      const nuevoMarcador = {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: marcador.nombre,
        id: marcador.id
      };
      console.log(nuevoMarcador);
      this.wsService.emit('mover-marcador', nuevoMarcador);
    });
  }

}
