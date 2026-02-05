import ContentRenderer from "./content-renderer.js";

export default class IndexRenderer extends ContentRenderer {
	constructor() {
		super();
		this.graph = "";
	}

	getGraphic(percentage) {
    if (percentage >= 0 && percentage <= 0.25) {
        return "░";
    } else if (percentage > 0.25 && percentage <= 0.5) {
        return "▒";
    } else if (percentage > 0.5 && percentage <= 0.75) {
        return "▓";
    } else if (percentage > 0.75 && percentage <= 1) {
        return "█";
    }
  }

	render(percentage) {
		this.graph += this.getGraphic(percentage);
		super.render(this.graph);
	}
}