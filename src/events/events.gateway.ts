import { OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ACTIONS } from 'app.constants';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  userNameSocketIdMap = {};
  socketIdToRoomId = {};

  getAllConnectedClients(roomId: string) {
    // return Array of connected clients with socketId and username
    return Array.from(this.server.sockets.adapter.rooms.get(roomId) || []).map(
      (socketId) => {
        return { socketId, username: this.userNameSocketIdMap[socketId] };
      },
    );
  }

  @SubscribeMessage(ACTIONS.JOIN)
  onJoinEvent(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const { roomId, username } = data;
    this.userNameSocketIdMap[socket.id] = username;
    if (this.socketIdToRoomId[socket.id]) {
      this.socketIdToRoomId[socket.id].push(roomId);
    } else {
      this.socketIdToRoomId[socket.id] = [roomId];
    }
    socket.join(roomId);
    const connectedClients = this.getAllConnectedClients(roomId);

    connectedClients.forEach((client) => {
      const clientSocketId = client.socketId;
      this.server.to(clientSocketId).emit(ACTIONS.JOINED, {
        connectedClients,
        socketId: socket.id,
        username,
      });
    });
  }

  handleDisconnect(socket: Socket) {
    console.log('cliend disconnected', socket.id);
    // get All Rooms associated with current client
    const rooms = this.socketIdToRoomId[socket.id];
    // disconnect from each room
    rooms.forEach((roomId) => {
      this.server.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: this.userNameSocketIdMap[socket.id],
      });
      delete this.userNameSocketIdMap[socket.id];
      socket.leave(roomId);
    });
  }
}
