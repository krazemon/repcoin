'use strict';

var $ = require('jquery');
var auth = require('../auth.jsx');
var CategoriesHeader = require('./CategoriesHeader');
var CategoriesItem = require('./CategoriesItem');
var CategoryInput = require('./CategoryInput');
var CategoryDelete = require('./CategoryDelete.jsx');
var PubSub = require('pubsub-js');
var React = require('react');

var CategoriesTable = React.createClass({
  getInitialState: function() {
    return { addMode: false,
             editHover: false,
             deleteMode: false,
             showDeleteBox: false,
             categoryToDelete: '',
             error: null };
  },

  handleMouseOver: function() {
    if (!this.state.showDeleteBox && !this.state.addMode && !this.state.deleteMode) {
      this.setState({ editHover: true });
    }
  },

  handleMouseLeave: function() {
    this.setState({ editHover: false });
  },

  handleAddClick: function() {
    this.setState({ addMode: true, editHover: false, deleteMode: false, showDeleteBox: false, error: null });
  },

  handleDeleteClick: function() {
    this.setState({ deleteMode: true, editHover: false, addMode: false, showDeleteBox: false, error: null });
  },

  handleCancelClick: function() {
    this.setState({ deleteMode: false, addMode: false, showDeleteBox: false, error: null });
  },

  showDeleteBox: function(categoryToDelete) {
    this.setState({ categoryToDelete: categoryToDelete,
                    showDeleteBox: true,
                    error: null });
  },

  closeInputBox: function() {
    this.setState({ addMode: false });
  },

  closeDeleteBox: function() {
    this.setState({ showDeleteBox: false, deleteMode: false });
  },

  deleteExpertCategory: function(e) {
    e.preventDefault();
    var url = '/api/users/' + this.props.currentUser._id + '/'
      + this.state.categoryToDelete.name + '/expert/delete';
    $.ajax({
      url: url,
      type: 'PUT',
      success: function(user) {
        auth.storeCurrentUser(user, function(user) {
          return user;
        });
        PubSub.publish('profileupdate');
        this.setState({ deleteMode: false, showDeleteBox: false });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(status, err.toString());
      }.bind(this)
    });
  },

  setError: function(error) {
    this.setState({ error: error });
  },

  // Get the categories rows for the table
  // Show reps if includeReps is true
  getCategoriesItems: function(includeReps) {
    var categoriesItems = [];
    var length = this.props.user.categories.length;
    var category;
    for (var i = 0; i < length; i++) {
      var category = this.props.user.categories[i];
      categoriesItems.push(
        <CategoriesItem key={category.id} category={category} includeReps={includeReps}
          deleteMode={this.state.deleteMode} showDeleteBox={this.showDeleteBox} />
      );
    }
    return categoriesItems;
  },

  render: function() {
    var error = this.state.error ? <div className="alert alert-info" role="alert">{this.state.error}</div> : '';
    var edit = '';
    var addCategory = '';
    var deleteCategory= '';

    if (this.props.currentUser._id === this.props.user._id) {
      if (this.state.editHover) {
        edit = <div className="editCategoriesBtn">
          <a onClick={this.handleAddClick}><span className="pencil glyphicon glyphicon-plus"></span></a>
          <p className="divider"> | </p>
          <a onClick={this.handleDeleteClick}><span className="remove glyphicon glyphicon-remove"></span></a>
        </div>;
      } else if (this.state.addMode || this.state.deleteMode || this.state.showDeleteBox) {
        edit = <div className="editCategoriesBtn">
          <button className="btn btn-default" onClick={this.handleCancelClick}>Cancel</button>
        </div>;
      }

      if (this.state.showDeleteBox) {
        deleteCategory = <CategoryDelete onReset={this.closeDeleteBox} investor={false}
          onDelete={this.deleteExpertCategory} name={this.state.categoryToDelete.name}/>;
      }

      if (this.state.addMode) {
        addCategory = <CategoryInput user={this.props.user} onReset={this.closeInputBox} expert={true} setError={this.setError} />;
      }
    }

    var includeReps = false;
    var repsHeader = '';
    if (this.props.currentUser.username === this.props.user.username) {
        includeReps = true;
        repsHeader = <th>Reps</th>;
    }

    // The key for the expert table will change if a category is deleted
    var length = this.props.user.categories.length;
    var key = this.props.user._id + length;
    var categoryRows = this.getCategoriesItems(includeReps);
    var addCategoriesText = '';
    if (length === 0) {
      var text = 'You are not an expert for any categories yet! Click the "+" ' +
        'in the top right to add some. You can create any categories that you do not find.';
      addCategoriesText = <div className="add-category-text">{text}</div>;
    }

    return (
      <div key={key} className="categoriesTable panel panel-default" onMouseOver={this.handleMouseOver} onMouseLeave={this.handleMouseLeave}>
        <CategoriesHeader user={this.props.user} />
        {edit}
        {error}
        {addCategory}
        {deleteCategory}
        <table className="table table-bordered table-striped">
          <tbody>
            <tr>
              <th>Category</th>
              <th>Percentile</th>
              <th>Top Investors</th>
              {repsHeader}
            </tr>
            {categoryRows}
          </tbody>
        </table>
        <p>{addCategoriesText}</p>
      </div>
    );
  }
});

module.exports = CategoriesTable;
