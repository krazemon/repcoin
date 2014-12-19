process.env.NODE_ENV = 'test';
var utils = require('../api/routes/utils.js');
var urlConfig = require('../config/url.js');

var Category = require('../api/models/Category.js');
var Transaction = require('../api/models/Transaction.js');
var User = require('../api/models/User.js');

describe('Utils: ', function() {
  describe('validateUserLinks: ', function() {
    it('returns true if inputs are correct', function() {
      var links = [{ title: 'foo', url: 'bar' }];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(true);
    });

    it('returns false if a title is incorrect', function() {
      var links = [{ title: '', url: 'bar' }];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(false);

      links = [{ url: 'bar' }];
      result = utils.validateUserLinks(links);
      expect(result).toEqual(false);
    });

    it('returns false if a url is incorrect', function() {
      var links = [{ title: 'foo', url: '' }];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(false);

      links = [{ title: 'foo' }];
      result = utils.validateUserLinks(links);
      expect(result).toEqual(false);
    });
  });

  describe('validateUserInputs: ', function() {
    it('returns true if inputs are correct', function() {
      var req = { body: { about: 'Hello!' }};
      var result = utils.validateUserInputs(req);
      expect(result).toEqual(true);
    });

    it('returns false if about is incorrect', function() {
      var req = { body: { about: '    ' }};
      var result = utils.validateUserInputs(req);
      expect(result).toEqual(false);
    });

  });

  describe('updateTransactionInputs: ', function() {
    it('returns true if inputs are correct', function() {
      var req = { body : {
        from      : { id: '1', name: 'foo' },
        to        : { id: '2', name: 'bar' },
        amount    : 10,
        category  : 'foo'
      }};

      var result = utils.updateTransactionInputs(req);
      expect(result).toEqual(true);  
    });

    it('returns false if amount is incorrect', function() {
      var req = { body : {
        from      : { id: '1', name: 'foo' },
        to        : { id: '2', name: 'bar' },
        amount    : 10.1,
        category  : 'foo'
      }};

      var result = utils.updateTransactionInputs(req);
      expect(result).toEqual(false);  

      req.body.amount = 'foo';
      var result = utils.updateTransactionInputs(req);
      expect(result).toEqual(false);  
    });

    it('returns false if no id is supplied for a revoke', function() {
      var req = { body : {
        from      : { id: '1', name: 'foo' },
        to        : { id: '2', name: 'bar' },
        amount    : -1,
        category  : 'foo'
      }};

      var result = utils.updateTransactionInputs(req);
      expect(result).toEqual(false);  
    });

  });

  describe('updateExpertPercentiles: ', function() {
    beforeEach(function() {
      cb = jasmine.createSpy();
    });
    var category = 'Coding';
    var expertsPromise = {
      experts: [
        { _id: '1', categories: [ { name: category, reps: 9, percentile: 50 }] },
        { _id: '2', categories: [ { name: category, reps: 1, percentile: 50 }] },
        { _id: '3', categories: [ { name: category, reps: 8, percentile: 50 }] },
        { _id: '4', categories: [ { name: category, reps: 5, percentile: 50 }] },
      ],

      then: function(cb) {
        return cb(this.experts);
      }
    };

    it('should correctly update percentiles for some experts', function() {
      spyOn(User, 'findExpertByCategory').andReturn(expertsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(experts, cb) {
        return cb([]);
      });
      spyOn(utils, 'getExpertPercentiles').andCallFake(function(experts, category, cb) {
        return cb(null);
      });
      utils.updateExpertPercentiles(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('should correctly handle error from getExpertPercentiles', function() {
      spyOn(User, 'findExpertByCategory').andReturn(expertsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(experts, cb) {
        return cb([]);
      });
      spyOn(utils, 'getExpertPercentiles').andCallFake(function(experts, category, cb) {
        return cb('getExpertPercentile error');
      });
      utils.updateExpertPercentiles(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('getExpertPercentile error');
    });

    it('should correctly handle error from saveAll()', function() {
      spyOn(User, 'findExpertByCategory').andReturn(expertsPromise);
      var errs = ['Error from saveAll()'];
      spyOn(utils, 'saveAll').andCallFake(function(experts, cb) {
        return cb(errs);
      });
      spyOn(utils, 'getExpertPercentiles').andCallFake(function(experts, category, cb) {
        return cb(null);
      });
      utils.updateExpertPercentiles(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(errs);
    });
  });

  describe('updateInvestors: ', function() {
    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    var category = 'Coding';
    var investorsPromise = {
      investors: [
        { _id: '1', portfolio: [ { category: category, roi: {length: 1, value: 9}, percentile: 50 }] },
        { _id: '2', portfolio: [ { category: category, roi: {length: 1, value: 5}, percentile: 50 }] },
        { _id: '3', portfolio: [ { category: category, roi: {length: 1, value: 3}, percentile: 50 }] },
        { _id: '4', portfolio: [ { category: category, roi: {length: 1, value: 4}, percentile: 50 }] },
      ],

      then: function(cb) {
        return cb(this.investors);
      }
    };

    it('should call updateInvestorPercentagesAndValuations when parameters are provided', function() {
      spyOn(utils, 'updateInvestorPercentagesAndValuations')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb([]);
      });
      spyOn(utils, 'getInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb(null);
      });
      utils.updateInvestors(category, cb, 100, 'Coding', 'Matt');
      expect(utils.updateInvestorPercentagesAndValuations.callCount).toEqual(1);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('should correctly update percentiles for some investors', function() {
      spyOn(utils, 'updateInvestorPercentagesAndValuations')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb([]);
      });
      spyOn(utils, 'getInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb(null);
      });
      utils.updateInvestors(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('should correctly handle error from getInvestorPercentiles', function() {
      spyOn(utils, 'updateInvestorPercentagesAndValuations')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb([]);
      });
      spyOn(utils, 'getInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb('getInvestorPercentile error');
      });
      utils.updateInvestors(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('getInvestorPercentile error');
    });

    it('should correctly handle error from saveAll()', function() {
      spyOn(utils, 'updateInvestorPercentagesAndValuations')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      var errs = ['Error from saveAll()'];
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb(errs);
      });
      spyOn(utils, 'getInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb(null);
      });
      utils.updateInvestors(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(errs);
    });
  });

  describe('roiComparator: ', function() {
    it('should correctly sort users by ROI in increasing order', function() {
      var users = [
        { _id: '1', portfolio: [{ category: 'Coding', roi: { value: 3 }}] },
        { _id: '2', portfolio: [{ category: 'Coding', roi: { value: 5 }}] },
        { _id: '3', portfolio: [{ category: 'Coding', roi: { value: 3 }}] },
        { _id: '4', portfolio: [{ category: 'Coding', roi: { value: 1 }}] },
      ];

      var expected = [
        { _id: '4', portfolio: [{ category: 'Coding', roi: { value: 1 }}] },
        { _id: '1', portfolio: [{ category: 'Coding', roi: { value: 3 }}] },
        { _id: '3', portfolio: [{ category: 'Coding', roi: { value: 3 }}] },
        { _id: '2', portfolio: [{ category: 'Coding', roi: { value: 5 }}] },
      ];

      var roiComparator = utils.getROIComparator('Coding');
      var results = users.sort(roiComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });
  });

  describe('percentileComparator: ', function() {
    it('should correctly sort users by percentile in decreasing order', function() {
      var users = [
        { _id: '1', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '2', categories: [{ name: 'Coding', percentile: 5 }] },
        { _id: '3', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '4', categories: [{ name: 'Coding', percentile: 1 }] },
      ];

      var expected = [
        { _id: '2', categories: [{ name: 'Coding', percentile: 5 }] },
        { _id: '1', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '3', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '4', categories: [{ name: 'Coding', percentile: 1 }] },
      ];

      var percentileComparator = utils.getDirectScoreComparator('Coding');
      var results = users.sort(percentileComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });
  });

  describe('repsComparator: ', function() {
    it('should correctly sort users by reps in increasing order', function() {
      var users = [
        { _id: '1', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '2', categories: [{ name: 'Coding', reps: 5 }] },
        { _id: '3', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '4', categories: [{ name: 'Coding', reps: 1 }] },
      ];

      var expected = [
        { _id: '4', categories: [{ name: 'Coding', reps: 1 }] },
        { _id: '1', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '3', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '2', categories: [{ name: 'Coding', reps: 5 }] },
      ];

      var repsComparator = utils.getRepsComparator('Coding');
      var results = users.sort(repsComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });
  });

  describe('updateROI: ', function() {
    it('should correctly update roi when it starts as 0', function() {
      var oldROI = { length: 0, value: 0 };
      var roiFromRevoke = 5;
      var roi = utils.updateROI(oldROI, roiFromRevoke);
      expect(roi).toEqual({ length: 1, value: 5 });
    });

    it('should correctly update roi when it has an arbitrary value', function() {
      var oldROI = { length: 4, value: 2.5 };
      var roiFromRevoke = 1.2;
      var roi = utils.updateROI(oldROI, roiFromRevoke);
      expect(roi).toEqual({ length: 5, value: 2.24 });
    });

  });

  describe('getInvestorPercentiles: ', function() {
    var investors, category, cb;
    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    it('should give all investors a percentile of 50 if ROIs are the same', function() {
      category = 'Coding';
      investors = [
        { _id: '1', portfolio: [ { category: category, roi: { value: 10, length: 2 } }] },
        { _id: '2', portfolio: [ { category: category, roi: { value: 10, length: 2 } }] },
      ];

      utils.getInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(investors[0].portfolio[0].percentile).toEqual(50);
      expect(investors[1].portfolio[0].percentile).toEqual(50);
    });

    it('should give all investors correct percentiles if ROIs are different', function() {

      category = 'Coding';
      investors = [
        { _id: '1', portfolio: [ { category: category, roi: { value: 10, length: 2 } }] },
        { _id: '2', portfolio: [ { category: category, roi: { value: 13, length: 2 } }] },
        { _id: '3', portfolio: [ { category: category, roi: { value: 19, length: 2 } }] },
        { _id: '4', portfolio: [ { category: category, roi: { value: 20, length: 2 } }] },
      ];

      utils.getInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(investors[0].portfolio[0].percentile).toEqual(12);
      expect(investors[1].portfolio[0].percentile).toEqual(37);
      expect(investors[2].portfolio[0].percentile).toEqual(62);
      expect(investors[3].portfolio[0].percentile).toEqual(87);
    });

    it('should give a single investor a percentile of 50', function() {
      category = 'Coding';
       var investments = [
        { valuation: 40, amount: 10 },
      ];

      investors = [
        { _id: '1', portfolio: [ { category: category, roi: { value: 10, length: 2 } }] },
      ];

      utils.getInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(investors[0].portfolio[0].percentile).toEqual(50);
    });

    it('should return an error if the first investor does not have the category', function() {
      category = 'Coding';
      investors = [
        { _id: '1', portfolio: [ { category: 'A', roi: { value: 10, length: 2 } }], username: 'Matt Ritter' },
      ];
      utils.getInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find portfolio index for user Matt Ritter');
    });

    it('should return an error if any investor does not have the category', function() {
      category = 'Coding';
      investors = [
        { _id: '1', username: 'Matt Ritter', portfolio: [ { category: category, roi: { value: 10, length: 2 } }], },
        { _id: '2', username: 'Bob', portfolio: [ { category: 'A', roi: { value: 10, length: 2 } }] },
      ];

      utils.getInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find portfolio index for user Bob');
    });
  });

  describe('getExpertPercentiles: ', function() {
    var experts, category, cb;

    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    it('should give all experts a percentile of 50 if reps are the same', function() {
      category = 'Coding';
      experts = [
        { _id: '1', categories: [ { name: category, reps: 10 }] },
        { _id: '2', categories: [ { name: category, reps: 10 }] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(experts[0].categories[0].percentile).toEqual(50);
      expect(experts[1].categories[0].percentile).toEqual(50);
    });

    it('should give all experts correct percentiles if reps are different', function() {
      category = 'Coding';
      experts = [
        { _id: '1', categories: [ { name: category, reps: 10 }] },
        { _id: '2', categories: [ { name: category, reps: 12 }] },
        { _id: '3', categories: [ { name: category, reps: 14 }] },
        { _id: '4', categories: [ { name: category, reps: 16 }] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(experts[0].categories[0].percentile).toEqual(12);
      expect(experts[1].categories[0].percentile).toEqual(37);
      expect(experts[2].categories[0].percentile).toEqual(62);
      expect(experts[3].categories[0].percentile).toEqual(87);
    });

    it('should give a single expert a percentile of 50', function() {
      category = 'Coding';
      experts = [
        { _id: '1', categories: [ { name: category, reps: 10 }] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(experts[0].categories[0].percentile).toEqual(50);
    });

    it('should return an error if the first expert does not have the category', function() {
      category = 'Coding';
      experts = [
        { _id: '1', username: 'Matt Ritter', categories: [] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find category index for user Matt Ritter');
    });

    it('should return an error if any expert does not have the category', function() {
      category = 'Coding';
      experts = [
        { _id: '1', username: 'Matt Ritter', categories: [{ name: category, reps: 10 }] },
        { _id: '2', username: 'Bob', categories: [] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find category index for user Bob');
    });
  });

  describe('updateInvestorPortfolio', function() {
    var portfolio, category, toUser, amount, toUserCategoryTotal;

    it('should return null if the user is not an investor for this category', function() {
      portfolio = [{ category: 'Ballet' }];
      category = 'Coding';
      var result = utils.updateInvestorPortfolio(portfolio, category, toUser, amount, toUserCategoryTotal);
      expect(result).toEqual(null);
    });

    it('should return null if revoking from a non-existent investment', function() {
      portfolio = [{ category: 'Coding', investments: [] }];
      category = 'Coding';
      amount = -1;
      var result = utils.updateInvestorPortfolio(portfolio, category, toUser, amount, toUserCategoryTotal);
      expect(result).toEqual(null);
    });

    it('should add user to the portfolio if investment is a give', function() {
      existingPortfolio = [{ reps: 100, category: 'Coding', investments: [] }];
      amount = 10;
      toUserCategoryTotal = 20;
      toUser = { id: '123', name: 'Matt' };

      var p = utils.updateInvestorPortfolio(existingPortfolio, category, toUser, amount, toUserCategoryTotal);
      var newInvestment = { user: 'Matt', userId: '123', amount: 10, valuation: 10, percentage: 50 };
      expect(p[0].investments).toEqual([newInvestment]);
      expect(p[0].reps).toEqual(90);
    });

    it('should update the existing investment and roi if revoke', function() {
      var existingInvestment = { _id: '1', user: "Matt", userId: "123", amount: 10, valuation: 100, percentage: 10 };
      existingPortfolio = [{ reps: 100, category: "Coding", roi: { value: 0, length: 0 }, investments: [existingInvestment] }];
      amount = -2;
      toUserCategoryTotal = 998;
      toUser = { id: "123", name: "Matt" };
      var expectedROI =  { length: 1, value: 18 };
      var id = '1';
      var p = utils.updateInvestorPortfolio(existingPortfolio, category, toUser, amount, toUserCategoryTotal, id);

      expect(p[0].investments.length).toEqual(1);
      expect(p[0].investments[0].amount).toEqual(8);
      expect(p[0].investments[0].percentage).toEqual(8);
      expect(p[0].investments[0].valuation).toEqual(79);
      expect(p[0].roi).toEqual(expectedROI);
      expect(p[0].reps).toEqual(120);
    });

    it('should remove the investment if it is entirely revoked', function() {
      var existingInvestment = { _id: '1', user: "Matt", userId: "123", amount: 10, valuation: 100, percentage: 10 };
      var existingInvestment2 = { _id: '2', user: "Bob", userId: "456", amount: 10, valuation: 100, percentage: 10 };
      existingPortfolio = [{ reps: 100, category: "Coding", roi: { value: 0, length: 0 }, investments: [existingInvestment, existingInvestment2] }];
      amount = -10;
      toUserCategoryTotal = 990;
      toUser = { id: "123", name: "Matt" };
      var id = '1';
      var p = utils.updateInvestorPortfolio(existingPortfolio, category, toUser, amount, toUserCategoryTotal, id);

      expect(p[0].investments.length).toEqual(1);
      expect(p[0].investments[0]._id).toEqual('2');
      expect(p[0].reps).toEqual(200);
    });
  });

  describe('addInvestorToExpertCategory', function() {
    var investorName = 'Bob';
    var investorId = '123';
    var i, categories, expert, investors;

    it('should return the expert unchanged if the investor was present', function() {
      investors = [{ name: 'Bob', id: '123' }];
      categories = [{ name: 'Coding', investors: investors }];
      expert = { categories: categories };
      i = 0;
      var e = utils.addInvestorToExpertCategory(expert, investorId, investorName, i);
      expect(e.categories[i].investors).toEqual(investors);
    });

    it('should add the investor to the category if the investor was not present', function() {
      categories = [{ name: 'Coding', investors: [] }];
      expert = { categories: categories };
      i = 0;
      var e = utils.addInvestorToExpertCategory(expert, investorId, investorName, i);
      expect(e.categories[i].investors).toEqual([{ name: 'Bob', id: '123' }]);
    });
  });

  describe('getCategoryIndex: ', function() {
    var categories = [
      { name: 'Ballet' },
      { name: 'Coding' },
    ];

    var expert = { categories: categories };
    it('should return the index of the category if present', function() {
      var i = utils.getCategoryIndex(expert, 'Coding');
      expect(i).toEqual(1);
    });

    it('should return -1 when the category is not present', function() {
      var i = utils.getCategoryIndex(expert, 'Foo');
      expect(i).toEqual(-1);
    });

    it('should return -1 if the expert has no categories', function() {
      var emptyExpert = { categories: [] };
      var i = utils.getCategoryIndex(emptyExpert, 'Coding');
      expect(i).toEqual(-1);
    });
  });

  describe('getPortfolioIndex: ', function() {
    var portfolio = [
      { category: 'Ballet' },
      { category: 'Coding' },
    ];

    var investor = { portfolio: portfolio };
    it('should return the index of the category if present', function() {
      var i = utils.getPortfolioIndex(investor, 'Coding');
      expect(i).toEqual(1);
    });

    it('should return -1 when the category is not present', function() {
      var i = utils.getPortfolioIndex(investor, 'Foo');
      expect(i).toEqual(-1);
    });

    it('should return -1 if the investor has no categories', function() {
      var emptyInvestor = { portfolio: [] };
      var i = utils.getPortfolioIndex(emptyInvestor, 'Coding');
      expect(i).toEqual(-1);
    });
  });

  describe('updateInvestorPercentagesAndValuations', function() {
    it('should correctly update percentages and valuations', function() {
      var category = 'Coding';
      var expertCategoryTotal = 100;
      var username = 'Matt';

      var investment1 = { user: 'Matt', userId: '123', amount: 8, valuation: 14, percentage: 20 };
      var investment2 = { user: 'Matt', userId: '123', amount: 5, valuation: 12, percentage: 15 };
      var investment3 = { user: 'Matt', userId: '123', amount: 20, valuation: 11, percentage: 10 };
      var investment4 = { user: 'Bob', userId: '456', amount: 10, valuation: 10, percentage: 14 };

      var investors = [
        { _id: '1', portfolio: [ { category: category, investments: [investment1] }] },
        { _id: '2', portfolio: [ { category: category, investments: [investment2] }] },
        { _id: '3', portfolio: [ { category: category, investments: [investment3] }] },
        { _id: '4', portfolio: [ { category: category, investments: [investment4] }] },
      ];

      var result1 = { user: 'Matt', userId: '123', amount: 8, valuation: 8, percentage: 8 };
      var result2 = { user: 'Matt', userId: '123', amount: 5, valuation: 5, percentage: 5 };
      var result3 = { user: 'Matt', userId: '123', amount: 20, valuation: 20, percentage: 20 };
      var result4 = { user: 'Bob', userId: '456', amount: 10, valuation: 10, percentage: 14 };

      var expectedInvestors = [
        { _id: '1', portfolio: [ { category: category, investments: [result1] }] },
        { _id: '2', portfolio: [ { category: category, investments: [result2] }] },
        { _id: '3', portfolio: [ { category: category, investments: [result3] }] },
        { _id: '4', portfolio: [ { category: category, investments: [result4] }] },
      ];

      var results = utils.updateInvestorPercentagesAndValuations(investors, expertCategoryTotal, category, username);
      expect(results).toEqual(expectedInvestors);
    });
  });

  describe('saveAll: ', function() {
    beforeEach(function() {
      jasmine.Clock.useMock();
      saveLogic = jasmine.createSpy();
      mainCB = jasmine.createSpy();
    });

    it('should simply return if there are 0 docs passed in', function() {
      var docs = [];
      utils.saveAll(docs, mainCB);
      expect(mainCB.callCount).toEqual(1);
      expect(mainCB).toHaveBeenCalledWith([]);
    });

    it('should not call the callback until the docs have been saved', function() {
      var mockSave = function(cb) {
        setTimeout(function() {
          saveLogic();
          cb();
        }, 100);
      };

      docs = [
        {save: mockSave},
        {save: mockSave},
      ];

      utils.saveAll(docs, mainCB);

      expect(saveLogic.callCount).toEqual(0);
      expect(mainCB.callCount).toEqual(0);

      jasmine.Clock.tick(101);

      expect(saveLogic.callCount).toEqual(2);
      expect(mainCB.callCount).toEqual(1);
      expect(mainCB).toHaveBeenCalledWith([]);
    });

    it('should accumulate errors and pass them to the callback', function() {
      var i = 0;
      var errors = ['1', '2'];
      var mockSave = function(cb) {
        setTimeout(function() {
          saveLogic();
          cb(errors[i]);
          i++;
        }, 100);
      };

      docs = [
        {save: mockSave},
        {save: mockSave},
      ];

      utils.saveAll(docs, mainCB);
      jasmine.Clock.tick(101);

      expect(mainCB).toHaveBeenCalledWith(['1', '2']);
    });
  });

  describe('generateVerificationToken', function() {
    it('should generate a verification token with length 24', function() {
      expect(utils.generateVerificationToken().length).toEqual(24);
    });

    it ('should generate unique tokens', function() {
      expect(utils.generateVerificationToken()).not.toEqual(utils.generateVerificationToken());
    });
  });

  describe('generateVerificationEmailOptions', function() {
    it('should add the url to the text', function() {
      expect(utils.generateVerificationEmailOptions('test@test.com', 'test')).toEqual({
        from: jasmine.any(String),
        to: 'test@test.com',
        subject: jasmine.any(String),
        text: 'Hi!\n\n Please confirm your new account for Repcoin by clicking this URL: '
          + urlConfig[process.env.NODE_ENV] + '#/verify/test '
          + '\n\n\n Thanks,\nThe Repcoin Team',
      });
    });
  });
});
