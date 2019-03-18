const Launchpad = require("launchpad-mini");
const ButtonView = require("./view/button").Button;
const ButtonViewModel = require("./view-model/button").Button;
const SoundPlayer = require("./sound-player").SoundPlayer;

class Board {
  constructor(config = {}) {
    this.config = config
    this.player = new SoundPlayer(this.config.sound);
    this.pad = new Launchpad();
    this.pad.setMaxListeners(128);

    this.boardModels = [];

    this.boundGridButtonViewModels = [];
    this.gridButtonViewModels = [];
    this.autoMapButtonViewModels = [];
    this.sceneButtonViewModels = [];

    this.gridButtonViews = [];
    this.autoMapButtonViews = [];
    this.sceneButtonViews = [];
  }

  async start() {
    await this.pad.connect();
  }

  async load(boardConfig) {
    if (!boardConfig) throw new Error("needs valid board config");

    await this.pad.reset();
    this.pad.removeAllListeners();
    this.autoMapButtonViewModels.forEach(viewMode => viewMode.detach());
    this.sceneButtonViewModels.forEach(viewMode => viewMode.detach());
    this.boundGridButtonViewModels.forEach(viewMode => viewMode.detach());

    this.boardModels = boardConfig.boards
      // rmerge 2D array back into list
      .map(board =>
        board.reduce((previous, current) => previous.concat(current), [])
      );

    this.gridButtonViewModels = this.boardModels.map(boardButtonViewModel =>
      boardButtonViewModel.map(
        buttonModel =>
          new ButtonViewModel(buttonModel, viewModel => {
            if (
              viewModel.model.sound &&
              viewModel.model.sound.uri &&
              !viewModel.isPressed
            )
              this.player.play(viewModel.model.sound.uri, viewModel.model.sound.options);
          })
      )
    );

    this.autoMapButtonViewModels = Array(8)
      .fill(0)
      .map(
        (value, index) =>
          new ButtonViewModel(
            {
              color: this.boardModels[index] ? "green" : "off"
            },
            (viewModel, key) => {
              if (!this.boardModels[index]) return;

              // revert other auto map buttons back
              this.autoMapButtonViewModels
                .filter(viewModelv => viewModel !== viewModelv)
                .forEach(viewModel => {
                  viewModel.color = viewModel.model.color;
                  viewModel.update();
                });
              // select this button
              viewModel.color = "red";

              let selected = index;
              this.boundGridButtonViewModels = rebindButtonViewModel(
                this.gridButtonViewModels[selected],
                this.gridButtonViews,
                this.boundGridButtonViewModels
              );

              this.cacheSoundsOnGrid(
                this.boundGridButtonViewModels,
                this.player
              );
            }
          )
      );

    this.sceneButtonViewModels = Array(8)
      .fill(0)
      .map(
        (value, index) =>
          new ButtonViewModel(
            {
              id: index,
              color: "off"
            },
            (viewModel, key) => {
              this.player.stop();
            }
          )
      );

    this.gridButtonViews = Launchpad.Buttons.Grid.map(
      coordinates => new ButtonView(this.pad, coordinates)
    );
    this.autoMapButtonViews = Launchpad.Buttons.Automap.map(
      coordinates => new ButtonView(this.pad, coordinates)
    );
    this.sceneButtonViews = Launchpad.Buttons.Scene.map(
      coordinates => new ButtonView(this.pad, coordinates)
    );

    rebindButtonViewModel(
      this.autoMapButtonViewModels,
      this.autoMapButtonViews
    );
    rebindButtonViewModel(this.sceneButtonViewModels, this.sceneButtonViews);

    //select first board
    if (this.autoMapButtonViewModels.length > 0)
      this.autoMapButtonViewModels[0].onUpdate();
  }

  cacheSoundsOnGrid(boundGridButtonViewModels, player) {
    // update every buttons cache state
    boundGridButtonViewModels
      .filter(viewModel => viewModel.model.sound)
      .forEach(viewModel => {
        viewModel.isCaching = !player.isCached(viewModel.model.sound.uri);
        viewModel.update();
      });

    // also try to lanch caching operation
    let urisToCache = boundGridButtonViewModels
      .filter(viewModel => viewModel.model.sound)
      .filter(viewModel => !player.isCached(viewModel.model.sound.uri))
      .map(viewModel => {
        let uri = viewModel.model.sound.uri;

        viewModel.isCaching = true;
        viewModel.update();

        return {
          uri: uri,
          done: () => {
            // unmark every button with that sound
            boundGridButtonViewModels
              .filter(viewModel => viewModel.model.sound)
              .filter(viewModel => viewModel.model.sound.uri === uri)
              .forEach(viewModel => {
                viewModel.isCaching = false;
                viewModel.update();
              });
          }
        };
      });
    player.cache(urisToCache);
  }
}
function attachButtonViewModel(buttonViewModels, buttonViews) {
  buttonViewModels.forEach((buttonViewModel, index) => {
    let buttonView = buttonViews[index];
    buttonViewModel.attach(buttonView);
  });
}

function rebindButtonViewModel(
  newButtonViewModels,
  buttonViews,
  oldButtonViewModels
) {
  (oldButtonViewModels || []).forEach(buttonViewModel =>
    buttonViewModel.detach()
  );
  attachButtonViewModel(newButtonViewModels, buttonViews);
  return newButtonViewModels;
}

module.exports = {
  SoundBoard: Board
};
