class Button {
  constructor(pad, coordinates) {
    this.pad = pad;
    this.coordinates = coordinates;

    this.eventListener = null
    this.eventFilter = key => {
      if (
        key[0] === this.coordinates[0] &&
        key[1] === this.coordinates[1] &&
        this.eventListener
      ) {
        this.eventListener(key);
      }
    }
    pad.on("key", this.eventFilter);
  }

  async col(color) {
    this.pad.col(color, this.coordinates);
  }

  isPressed() {
    this.pad.isPressed(this.coordinates);
  }

  on(listener) {
    this.eventListener = listener;
  }

  clearListener() {
    this.eventListener = null;
  }
}

module.exports = {
  Button: Button
};
