import BoardView from '../view/board';
import SortView from '../view/sort';
import FilmsListView from '../view/films-list';
import NoDataView from '../view/no-data';
import FilmPresenter from '../presenter/movie';
import ExtraContainerView from '../view/extra-container';
import ShowMoreButtonView from '../view/show-more-button';
import {RenderPosition, render, remove} from '../utils/render';
import {sortByDate, sortByRating, sortByComments} from '../utils/sort';
import {MOVIES_AMOUNT, SortType, UpdateType, UserAction} from '../const';

const extraListType = {
  TOP_RATED: {
    TITLE: `Top rated`,
    AMOUNT: MOVIES_AMOUNT.TOP_RATED,
    SORT: sortByRating,
  },
  MOST_COMMENTED: {
    TITLE: `Most commented`,
    AMOUNT: MOVIES_AMOUNT.MOST_COMMENTED,
    SORT: sortByComments,
  },
};

export default class Board {
  constructor(boardContainer, filmsModel) {
    this._boardContainer = boardContainer;
    this._filmsModel = filmsModel;
    this._renderedMoviesCount = MOVIES_AMOUNT.PER_STEP;
    this._currentSortType = SortType.DEFAULT;
    this._filmPresenter = {};
    this._filmTopRatedPresenter = {};
    this._filmMostCommentedPresenter = {};

    this._extraBoards = [];

    this._showMoreButtonComponent = null;
    this._sortComponent = null;

    this._boardComponent = new BoardView();
    this._filmsListComponent = new FilmsListView();
    this._noDataComponent = new NoDataView();

    this._handleViewAction = this._handleViewAction.bind(this);
    this._handleModelEvent = this._handleModelEvent.bind(this);
    this._handleShowMoreButtonClick = this._handleShowMoreButtonClick.bind(this);
    this._handleSortTypeChange = this._handleSortTypeChange.bind(this);
    this._handleModeChange = this._handleModeChange.bind(this);

    this._filmsModel.addObserver(this._handleModelEvent);
  }

  init() {
    this._renderBoard();
    this._renderExtraBoard();
  }

  _getFilms() {
    switch (this._currentSortType) {
      case SortType.DATE:
        return this._filmsModel.getFilms().slice().sort(sortByDate);
      case SortType.RATING:
        return this._filmsModel.getFilms().slice().sort(sortByRating);
      default:
        return this._filmsModel.getFilms();
    }
  }

  _handleViewAction(actionType, updateType, update) {
    switch (actionType) {
      case UserAction.UPDATE_MOVIE:
        this._filmsModel.updateFilm(updateType, update);
        break;
      case UserAction.ADD_COMMENT:
        this._filmsModel.addComment(updateType, update);
        break;
      case UserAction.DELETE_COMMENT:
        this._filmsModel.deleteComment(updateType, update);
        break;
    }
  }

  _handleModelEvent(updateType, data) {
    switch (updateType) {
      case UpdateType.PATCH:
        // data change only
        this._filmPresenter[data.id].init(data);
        break;
      case UpdateType.MAJOR:
        // full board rerendering
        this._clearBoard({resetRenderedFilmsCount: true, resetSortType: true});
        this._renderBoard();
        break;
    }
  }

  _handleModeChange() {
    [
      ...Object.values(this._filmPresenter),
      ...Object.values(this._filmTopRatedPresenter),
      ...Object.values(this._filmMostCommentedPresenter)
    ].forEach((presenter) => presenter.resetView());
  }

  _handleSortTypeChange(sortType) {
    if (this._currentSortType === sortType) {
      return;
    }

    this._currentSortType = sortType;
    this._clearBoard({resetRenderedFilmsCount: true});
    this._renderBoard();
  }

  _renderSort() {
    if (this._sortComponent !== null) {
      this._sortComponent = null;
    }

    this._sortComponent = new SortView(this._currentSortType);
    this._sortComponent.setSortTypeChangeHandler(this._handleSortTypeChange);
    render(this._boardContainer, this._sortComponent, RenderPosition.BEFOREEND);
  }

  _renderFilm(film, container, type) {
    const filmPresenter = new FilmPresenter(container, this._handleViewAction, this._handleModeChange);
    filmPresenter.init(film);

    switch (type) {
      case extraListType.TOP_RATED:
        this._filmTopRatedPresenter[film.id] = filmPresenter;
        break;
      case extraListType.MOST_COMMENTED:
        this._filmMostCommentedPresenter[film.id] = filmPresenter;
        break;
      default:
        this._filmPresenter[film.id] = filmPresenter;
    }
  }

  _renderFilms(films) {
    films.forEach((film) => this._renderFilm(film, this._filmsListComponent.getContainer()));
  }

  _renderNoData() {
    render(this._boardComponent, this._noDataComponent);
  }

  _handleShowMoreButtonClick() {
    const filmsCount = this._getFilms().length;
    const newRenderedFilmsCount = Math.min(filmsCount, this._renderedMoviesCount + MOVIES_AMOUNT.PER_STEP);
    const films = this._getFilms().slice(this._renderedMoviesCount, newRenderedFilmsCount);

    this._renderFilms(films);
    this._renderedMoviesCount = newRenderedFilmsCount;

    if (this._renderedMoviesCount >= filmsCount) {
      remove(this._showMoreButtonComponent);
    }
  }

  _renderShowMoreButton() {
    if (this._showMoreButtonComponent !== null) {
      this._showMoreButtonComponent = null;
    }

    this._showMoreButtonComponent = new ShowMoreButtonView();
    this._showMoreButtonComponent.setClickHandler(this._handleShowMoreButtonClick);
    render(this._filmsListComponent, this._showMoreButtonComponent);
  }

  _clearBoard({resetRenderedFilmsCount = false, resetSortType = false, clearExtraBoards = false} = {}) {
    const filmsCount = this._getFilms().length;

    Object
      .values(this._filmPresenter)
      .forEach((presenter) => presenter.destroy());

    this._filmPresenter = {};

    remove(this._sortComponent);
    remove(this._noDataComponent);
    remove(this._showMoreButtonComponent);

    if (resetRenderedFilmsCount) {
      this._renderedMoviesCount = MOVIES_AMOUNT.PER_STEP;
    } else {
      this._renderedMoviesCount = Math.min(filmsCount, this._renderedMoviesCount);
    }

    if (resetSortType) {
      this._currentSortType = SortType.DEFAULT;
    }

    if (clearExtraBoards) {
      [
        ...Object.values(this._filmTopRatedPresenter),
        ...Object.values(this._filmMostCommentedPresenter)
      ].forEach((presenter) => presenter.destroy());

      this._filmTopRatedPresenter = {};
      this._filmMostCommentedPresenter = {};

      this._extraBoards.forEach((board) => remove(board));
      this._extraBoards = [];
    }
  }

  _renderExtraList(listType, films) {
    const slicedFilms = films.slice();
    const extraListComponent = new ExtraContainerView(listType.TITLE);
    this._extraBoards.push(extraListComponent);
    render(this._boardComponent, extraListComponent);

    slicedFilms
      .sort(listType.SORT)
      .slice(0, listType.AMOUNT)
      .forEach((film) => this._renderFilm(film, extraListComponent.getContainer(), listType));
  }

  _renderExtraBoard() {
    const films = this._getFilms();

    this._renderExtraList(extraListType.TOP_RATED, films);
    this._renderExtraList(extraListType.MOST_COMMENTED, films);
  }

  _renderBoard() {
    const films = this._getFilms();
    const filmsCount = this._getFilms().length;

    this._renderSort();
    render(this._boardContainer, this._boardComponent, RenderPosition.BEFOREEND);

    if (filmsCount === 0) {
      this._renderNoData();
      return;
    }

    render(this._boardComponent, this._filmsListComponent, RenderPosition.AFTERBEGIN);
    this._renderFilms(films.slice(0, Math.min(filmsCount, this._renderedMoviesCount)));

    if (filmsCount > this._renderedMoviesCount) {
      this._renderShowMoreButton();
    }
  }
}
