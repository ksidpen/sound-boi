const Launchpad = require("launchpad-mini");
const inverts = {
  red: "green",
  green: "red",
  yellow: "green",
  amber: "red",
  off: "red"
};

class Button {
  constructor(model, onKey) {
    this.model = model;
    this.color = model.color;
    this.brightness = 3;
    this.isPressed = false;
    this.isCaching = false;
    this.onKey = onKey || (() => {});
  }
  /**
   * update state
   * @param {object} key state
   */
  onUpdate(key = {}) {
    this.isPressed = key.pressed;
    this.onKey(this, key);
    this.update();
  }

  update() {
    let brightness = this.isCaching ? 1 : this.brightness;
    // do invert of current color on select
    let color = this.isPressed ? inverts[this.color] : this.color;

    if (this.view) {
      return this.view.col(
        new Launchpad.Colors.Color(brightness, false, false, color)
      );
    }
  }

  attach(view) {
    this.view = view;
    this.view.on(this.onUpdate.bind(this));
    this.update();
  }

  detach() {
    this.view.clearListener();
    this.view = null;
  }
}

module.exports = {
  Button: Button
};
