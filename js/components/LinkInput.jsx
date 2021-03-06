'use strict';

var $ = require('jquery');
var PubSub = require('pubsub-js');
var React = require('react');
var strings = require('../lib/strings_utils.js');

var LinkInput = React.createClass({
  getInitialState: function() {
    return { error: null };
  },

  componentDidMount: function() {
    if (this.props.url) {
      $(".url-form").val(this.props.url);
    }

    if (this.props.title) {
      $(".title-form").val(this.props.title);
    }
  },

  handleSubmit: function(event) {
    event.preventDefault();

    // Validate input
    var title = this.refs.description.getDOMNode().value;
    var url = this.refs.url.getDOMNode().value;
    if (title.length > 50) {
      this.setState({ error: strings.TITLE_LONGER_THAN_50 });
    } else if (title.trim().length === 0) {
      this.setState({ error: strings.TITLE_BLANK });
    } else if (url.length > 2083) {
      this.setState({ error: strings.URL_LESS_THAN_2084 });
    } else if (url.trim().length === 0) {
      this.setState({ error: strings.URL_BLANK });
    } else {
      this.setState({ error: null });
      this.updateLinks({ title: title, url: url });
    }
  },

  getNewLinks: function(userLinks, link) {
    for (var i = 0; i < userLinks.length; i++) {
      var l = userLinks[i];
      if (this.props.title == l.title && this.props.url == l.url) {
        userLinks[i].title = link.title.length > 0 ? link.title : userLinks[i].title;
        userLinks[i].url = link.url.length > 0 ? link.url : userLinks[i].url;
        return userLinks;
      }
    }
    userLinks.push(link);
    return userLinks;
  },

  updateLinks: function(link) {
    var url = '/api/users/' + this.props.user._id;
    var links = this.getNewLinks(this.props.user.links, link);
    var user = this.props.user;
    user.links = links;
    $.ajax({
      url: url,
      type: 'PUT',
      data: user,
      success: function(user) {
        PubSub.publish('profileupdate');
        this.props.reset();
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(status, err.toString());
        this.props.reset();
      }.bind(this)
    });
  },

  render: function() {
    var error = this.state.error ? <div className="alert alert-danger" role="alert">{this.state.error}</div> : '';
    var title = this.props.title || strings.TITLE;
    var url = this.props.url || strings.URL;
    return (
      <div className="linkInput">
        <form onSubmit={this.handleSubmit} onReset={this.props.reset}>
          <div>
            <input type="text" ref="description" className="form-control title-form" placeholder={title}></input>
            <p> : </p>
            <input type="text" ref="url" className="form-control url-form" placeholder={url}></input>
          </div>
          <button type="submit" className="btn btn-success">Save</button>
          <button type="reset" className="btn btn-default">Cancel</button>
        </form>
        {error}
      </div>
    );
  }
});

module.exports = LinkInput;
