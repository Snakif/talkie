function _t(timecode) {
    if (typeof timecode === "string") {
        var m = timecode.match(/^(\d+):(\d+(?:\.\d+)?)$/);
        if (m) {
            return parseInt(m[1]) * 60 + parseFloat(m[2]);
        }
    }
    return parseFloat(timecode);
}

function run(animation, timeline_object) {
    if (typeof animation === "function") {
        animation.call(timeline_object);
    }
    else {
        animation.run(timeline_object);
    }
}

function order_timeline(timeline_object) {
    var timecode_strings = Object.keys(timeline_object);
    var timecodes = timecode_strings.map(_t);
    var a = {};
    for (var i=0; i<timecodes.length; i++) {
        a[timecodes[i]] = timeline_object[timecode_strings[i]];
    }
    timecodes.sort(function(a,b) { return a-b; });
    
    var track_animations = [];
    for (var i=0; i<timecodes.length; i++) {
        var t = timecodes[i];
        track_animations.push([ t, a[t] ]);
    }
    return track_animations;
}

Talkie.timeline = function(soundtrack_element, timeline_spec, options) {
    var animation_undo_stack = [],
        animation_current_index = -1; // index of last animation performed
    var timecode;
    
    var skip_the_next_timeUpdate = false;
    var timeline_object = {
        rewind: function() {
            if (soundtrack_element.readyState >= 1) {
                animation_undo_stack = [];
                animation_current_index = -1;
                soundtrack_element.pause();
                soundtrack_element.currentTime = 0;
            }
        },
        setUndo: function(undo_function) {
            animation_undo_stack.push([timecode, undo_function, animation_current_index]);
        },
        undoInteraction: function(undo_function) {
            animation_undo_stack.push([Infinity, undo_function, animation_current_index]);
        },
        pause: function() {
            soundtrack_element.pause();
            skip_the_next_timeUpdate = true;
        }
    };

    var track_animations = order_timeline(timeline_spec);
    if (typeof soundtrack_element === "string") {
        soundtrack_element = document.querySelector(soundtrack_element);
    }
    soundtrack_element.addEventListener("timeupdate", function() {
        if (skip_the_next_timeUpdate) {
            skip_the_next_timeUpdate = false;
            return;
        }
        while (animation_undo_stack.length > 0
            && animation_undo_stack[animation_undo_stack.length-1][0] > this.currentTime)
        {
            var stack_top = animation_undo_stack.pop();
            stack_top[1].call(timeline_object);
            animation_current_index = stack_top[2];
        }
        
        for (var i = animation_current_index + 1;
             i < track_animations.length && track_animations[i][0] <= this.currentTime;
             i++
        ) {
            timeline_object.fast_forward = (i+1 < track_animations.length && track_animations[i+1][0] <= this.currentTime);
            timecode = track_animations[i][0];
            run(track_animations[i][1], timeline_object);
            animation_current_index = i;
        }
    }, false);
    if (options && options.onplay) {
        soundtrack_element.addEventListener("play", options.onplay, false);
    }
    
    return timeline_object;
}
