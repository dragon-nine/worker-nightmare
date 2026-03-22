import Phaser from 'phaser';
import type { RoadRow, RoadType } from './constants';

export class Road {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private laneWorldX: number[];
  private numLanes: number;
  private laneW: number;
  private tileH: number;

  rows: RoadRow[] = [];
  startY = 0;
  private straightRemaining = 0;

  constructor(
    scene: Phaser.Scene,
    laneWorldX: number[],
    laneW: number,
    tileH: number,
    numLanes: number,
  ) {
    this.scene = scene;
    this.laneWorldX = laneWorldX;
    this.laneW = laneW;
    this.tileH = tileH;
    this.numLanes = numLanes;
    this.container = scene.add.container(0, 0).setDepth(5);
  }

  getContainer() {
    return this.container;
  }

  generateInitial(height: number, startLane: number) {
    this.startY = height - 200;
    this.straightRemaining = 1;
    this.addRow(startLane, this.startY);

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
      old.tiles.forEach(t => t.destroy());
      old.decoration?.destroy();
      currentRowIdx--;
    }
    return currentRowIdx;
  }

  private addRow(type: RoadType, y: number) {
    const prev = this.rows.length > 0 ? this.rows[this.rows.length - 1] : null;
    const isTurn = prev !== null && prev.type !== type;
    const row: RoadRow = { type, y, isTurn, tiles: [] };

    if (isTurn) {
      const prevLane = prev!.type;
      const lowerLane = Math.min(prevLane, type);
      const higherLane = Math.max(prevLane, type);
      const goingRight = type > prevLane;

      if (goingRight) {
        // left→right: lower gets corner-tl, higher gets corner-br
        const dept = this.createTile(this.laneWorldX[lowerLane], y, 'tile-corner-tl');
        const arr = this.createTile(this.laneWorldX[higherLane], y, 'tile-corner-br');
        row.tiles.push(dept, arr);
        this.container.add(dept);
        this.container.add(arr);
      } else {
        // right→left: lower gets corner-bl, higher gets corner-tr
        const arr = this.createTile(this.laneWorldX[lowerLane], y, 'tile-corner-bl');
        const dept = this.createTile(this.laneWorldX[higherLane], y, 'tile-corner-tr');
        row.tiles.push(arr, dept);
        this.container.add(arr);
        this.container.add(dept);
      }
    } else {
      const road = this.createTile(this.laneWorldX[type], y, 'tile-straight');
      row.tiles.push(road);
      this.container.add(road);
    }

    this.rows.push(row);
  }

  private createTile(x: number, y: number, key: string): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, key)
      .setDisplaySize(this.laneW, this.tileH)
      .setOrigin(0.5, 0.5);
  }

  private pickNextRoadType(prev: RoadType): RoadType {
    if (this.straightRemaining > 0) {
      this.straightRemaining--;
      return prev;
    }
    this.straightRemaining = Math.floor(Math.random() * 3);
    if (prev === 0) return 1;
    if (prev === this.numLanes - 1) return prev - 1;
    return Math.random() < 0.5 ? prev - 1 : prev + 1;
  }
}
