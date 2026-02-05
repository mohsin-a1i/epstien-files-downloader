import ContentRenderer from "./content-renderer.js";

export default class ProgressRenderer extends ContentRenderer {
	constructor(total) {
		super();
		this.total = total;
	}

	render(progress) {
		const width = 60;
		const percent = progress / this.total;

		const filled = Math.round(width * percent);
		const bar = "█".repeat(filled) + "-".repeat(width - filled);
		const content = `[${bar}] ${(percent * 100).toFixed(1)}%`;

		super.render(content);
	}
}