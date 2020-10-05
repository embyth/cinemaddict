import {createElement} from '../utils';

const createFooterStatsTemplate = (moviesAmount) => {
  return (
    `<section class="footer__statistics">
      <p>${moviesAmount} movies inside</p>
    </section>`
  );
};

export default class FooterStats {
  constructor(moviesAmount) {
    this._moviesAmount = moviesAmount;
    this._element = null;
  }

  getTemplate() {
    return createFooterStatsTemplate(this._moviesAmount);
  }

  getElement() {
    if (!this._element) {
      this._element = createElement(this.getTemplate());
    }

    return this._element;
  }

  removeElement() {
    this._element = null;
  }
}