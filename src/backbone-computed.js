(function(Backbone) {

	Backbone.Computed = function(args) {
		if (this instanceof Backbone.Computed) {
			args = Array.prototype.slice.call(args, 0);
	    this.computedFunction = args[args.length - 1];
	    this.dep = args.slice(0, -1);
		} else {
			return new Backbone.Computed(arguments);
		}
	};

	Backbone.Computed.prototype.getDependentProperties = function() {
		return this.dep;
	};

	var OriginalBackboneModel = Backbone.Model;

	Backbone.Model = OriginalBackboneModel.extend({
		constructor: function() {
			OriginalBackboneModel.apply(this, arguments);
			initializeComputedProperties.call(this);
		}
	});

	var ComputedPropertySetup = function(model, property, propertyName) {
		var computeValue = function() {
			model.set(propertyName, property.computedFunction.call(model));
		};

		var dependentProperties = _.memoize(function() {
			return  _.filter(property.getDependentProperties(), function(property) {
				return property.indexOf('event:') < 0;
			});
		});

		var dependentEvents = _.memoize(function() {
			return _.chain(property.getDependentProperties()).
				filter(function(property) {
					return property.indexOf('event:') === 0;
				}).
				map(function(property) {
					return property.replace('event:', '');
				}).
				value();
		});

		var propertiesEventsToListen = function() {
			return dependentProperties().map(function(propertyName) {
				return 'change:' + propertyName;
			});
		};

		var attachDependentPropertiesListeners = function() {
			if (!dependentProperties().length) { return; }
			var eventString = propertiesEventsToListen().join(' ');
			model.on(eventString, computeValue);
		};

		var attachDependentEventsListeners = function() {
			if (!dependentEvents().length) { return; }
			var eventString = dependentEvents().join(' ');
			model.on(eventString, computeValue);
		};

		attachDependentPropertiesListeners();
		attachDependentEventsListeners();
		computeValue();
	};

	function initializeComputedProperties() {
		var prototypeMember;
		var prototype = Object.getPrototypeOf(this);

		for (var key in prototype) {
			if (prototype.hasOwnProperty(key)) {
				prototypeMember = prototype[key];

				if (prototypeMember instanceof Backbone.Computed) {
					ComputedPropertySetup(this, prototypeMember, key);
				}
			}
		}
	}

})(Backbone);
