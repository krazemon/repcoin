'use strict';

var $ = require('jquery');
var LinkDelete = require('./LinkDelete.jsx');
var LinkInput = require('./LinkInput.jsx');
var PubSub = require('pubsub-js');
var React = require('react');
var strings = require('../lib/strings_utils.js');

var LinkItem = React.createClass({
  getInitialState: function() {
    return {
      showEdit: true,
      showInput: false,
      showDelete: false
    };
  },

  resetState: function() {
    this.setState({
      showEdit: true,
      showInput: false,
      showDelete: false
    });
  },

  componentWillReceiveProps: function(newProps) {
    if (this.props.user._id !== newProps.user._id) {
      this.resetState();
    }
  },

  handleEditClick: function() {
    this.setState({ showEdit: false, showInput: true });
  },

  handleDeleteClick: function() {
    this.setState({ showEdit: false, showInput: false, showDelete: true });
  },

  closeInputBox: function() {
    this.setState({ showEdit: true, showInput: false });
  },

  closeDeleteBox: function() {
    this.setState({ showEdit: true, showDelete: false });
  },

  deleteLinkItem: function() {
    var url = '/api/users/' + this.props.user._id;
    var links = [];
    for (var i = 0; i < this.props.user.links.length; i++) {
      var link = this.props.user.links[i];
      if (link.url != this.props.link.url && link.title != this.props.link.title) {
        links.push(link);
      }
    }
    if (links.length === 0) {
      links.push(strings.EMPTY);
    }
    this.updateUserLinks(links);
  },

  updateUserLinks: function(links) {
    var url = '/api/users/' + this.props.user._id;
    var user = this.props.user;
    user.links = links;
    $.ajax({
      url: url,
      type: 'PUT',
      data: user,
      success: function(user) {
        PubSub.publish('profileupdate');
        this.closeDeleteBox();
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(status, err.toString());
      }.bind(this)
    });
  },

  getUrl: function(url) {
    if ((url.lastIndexOf('http://', 0) !== 0) && (url.lastIndexOf('https://', 0) !== 0)) {
      return 'http://' + url;
    }

    return url;
  },

  render: function() {
    var edit = '';
    var del = '';
    var linkPlace =
        <div className="text">
          <strong>{this.props.link.title}</strong>: <a href={this.getUrl(this.props.link.url)}>{this.props.link.url}</a>
        </div>;

    if (this.props.currentUser && this.props.currentUser._id == this.props.user._id) {
      if (this.state.showEdit) {
        edit = <div className="edit">
          <a onClick={this.handleEditClick}><span className="pencil glyphicon glyphicon-pencil"></span></a>
          <p className="divider"> | </p>
          <a onClick={this.handleDeleteClick}><span className="remove glyphicon glyphicon-remove"></span></a>
        </div>;
      }

      if (this.state.showInput) {
        linkPlace = <LinkInput user={this.props.user} reset={this.closeInputBox} title={this.props.link.title} url={this.props.link.url}/>;
      }

      if (this.state.showDelete) {
        del = <LinkDelete reset={this.closeDeleteBox} delete={this.deleteLinkItem}/>;
      }
    }

    return(
      <div className="linkItem" onMouseOver={this.handleMouseOver} onMouseLeave={this.handleMouseLeave}>
        {linkPlace}
        {edit}
        {del}
      </div>
    );
  }
});

module.exports = LinkItem;
