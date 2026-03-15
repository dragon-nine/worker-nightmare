import Phaser from 'phaser';
import type { RoadRow, RoadType, LanePositions } from './constants';
import {
  OBSTACLE_CHANCE, OBSTACLE_SIZE_RATIO,
} from './constants';

const OBSTACLE_KEYS = ['building1', 'building2', 'building3', 'building4', 'building5'];

export class Road {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private laneX: LanePositions;
  private laneW: number;
  private tileH: number;

  rows: RoadRow[] = [];
  startY = 0;
  private straightRemaining = 0;

  constructor(scene: Phaser.Scene, laneX: LanePositions, laneW: number, tileH: number) {
    this.scene = scene;
    this.laneX = laneX;
    this.laneW = laneW;
    this.tileH = tileH;
    this.container = scene.add.container(0, 0).setDepth(5);
  }

  getContainer() {
    return this.container;
  }

  generateInitial(height: number) {
    this.startY = height - 200;
    this.straightRemaining = 1;
    this.addRow('left', this.startY);

    for (let i = 0; i < 25; i++) {
      this.addNextRow();
    }
  }

  addNextRow() {
    const last = this.rows[this.rows.length - 1];
    const nextY = last.y - this.tileH;
    const nextType = this.pickNextRoadType(last.type);
    this.addRow(nextType, nextY);
  }

  cleanupOldRows(currentRowIdx: number): number {
    while (currentRowIdx > 10) {
      const old = this.rows.shift()!;
      old.leftTile?.destroy();
      old.rightTile?.destroy();
      old.decoration?.destroy();
      currentRowIdx--;
    }
    return currentRowIdx;
  }

  private addRow(type: RoadType, y: number) {
    const prev = this.rows.length > 0 ? this.rows[this.rows.length - 1] : null;
    const isTurn = prev !== null && prev.type !== type;
    const row: RoadRow = { type, y, isTurn };

    if (isTurn) {
      if (prev!.type === 'left' && type === 'right') {
        row.leftTile = this.createTile(this.laneX.left, y, 'tile-corner-tl');
        row.rightTile = this.createTile(this.laneX.right, y, 'tile-corner-br');
      } else {
        row.leftTile = this.createTile(this.laneX.left, y, 'tile-corner-bl');
        row.rightTile = this.createTile(this.laneX.right, y, 'tile-corner-tr');
      }
      this.container.add(row.leftTile);
      this.container.add(row.rightTile);
    } else if (type === 'left') {
      row.leftTile = this.createTile(this.laneX.left, y, 'tile-straight');
      this.container.add(row.leftTile);
    } else {
      row.rightTile = this.createTile(this.laneX.right, y, 'tile-straight', true);
      this.container.add(row.rightTile);
    }

    if (!isTurn && Math.random() < OBSTACLE_CHANCE) {
      this.placeObstacle(row, type, y);
    }

    this.rows.push(row);
  }

  private createTile(x: number, y: number, key: string, flipX = false): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, key)
      .setDisplaySize(this.laneW, this.tileH)
      .setOrigin(0.5, 0.5)
      .setFlipX(flipX);
  }

  private placeObstacle(row: RoadRow, type: RoadType, y: number) {
    const emptyX = type === 'left' ? this.laneX.right : this.laneX.left;
    const key = OBSTACLE_KEYS[Math.floor(Math.random() * OBSTACLE_KEYS.length)];
    const size = this.laneW * OBSTACLE_SIZE_RATIO;
    const obstacle = this.scene.add.image(emptyX, y, key)
      .setDisplaySize(size, size)
      .setOrigin(0.5, 0.5)
      .setDepth(6);
    this.container.add(obstacle);
    row.decoration = this.scene.add.container(0, 0);
    row.decoration.add(obstacle);
    this.container.add(row.decoration);
  }

  private pickNextRoadType(prevType: RoadType): RoadType {
    if (this.straightRemaining > 0) {
      this.straightRemaining--;
      return prevType;
    }
    this.straightRemaining = Math.floor(Math.random() * 5);
    return prevType === 'left' ? 'right' : 'left';
  }
}
