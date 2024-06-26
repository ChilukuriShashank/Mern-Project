import User from "./User.js";
import FriendRequest from "./FriendRequest.js";

export const addfollower = async (req, res) => {
    const { senderId, receiverId, senderUsername, receiverUsername } = req.body;

    try {
        const existingRequest = await FriendRequest.findOne({ senderId, receiverId, status: 'pending' });

        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already exists" });
        }

        const friendRequest = new FriendRequest({ senderId, receiverId, senderUsername, receiverUsername });
        await friendRequest.save();

        await User.findByIdAndUpdate(receiverId, { $addToSet: { followers: senderId }, $inc: { followerscount: 1 } });
        await User.findByIdAndUpdate(senderId, { $addToSet: { following: receiverId }, $inc: { followingcount: 1 } });

        return res.status(200).json({ message: "Friend request sent successfully" });
    } catch (error) {
        console.error("Error occurred while sending friend request:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const removeFollower = async (req, res) => {
    const receiverId = req.params.receiverId;
    const followerId = req.body.followerId;

    try {
        const receiver = await User.findById(receiverId);
        const follower = await User.findById(followerId);

        if (!receiver || !follower) {
            return res.status(404).json({ message: "User or follower not found" });
        }

        receiver.followers = receiver.followers.filter(id => id.toString() !== followerId);
        receiver.followerscount -= 1;
        await receiver.save();

        follower.following = follower.following.filter(id => id.toString() !== receiverId);
        follower.followingcount -= 1;
        await follower.save();

        return res.status(200).json({ message: "Follower removed successfully" });
    } catch (error) {
        console.error("Error occurred while removing follower:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const acceptFriendRequest = async (req, res) => {
    const requestId = req.params.requestId;

    try {
        const request = await FriendRequest.findById(requestId);

        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: "Friend request not found or not pending" });
        }

       
        request.status = 'accepted';
        await request.save();

        
        const [receiver, sender] = await Promise.all([
            User.findByIdAndUpdate(request.receiverId, { $addToSet: { followers: request.senderId }, $inc: { followerscount: 1 } }),
            User.findByIdAndUpdate(request.senderId, { $addToSet: { following: request.receiverId }, $inc: { followingcount: 1 } })
        ]);

        return res.status(200).json({ message: "Friend request accepted successfully" });
    } catch (error) {
        console.error("Error occurred while accepting friend request:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getFollowersList = async (req, res) => {
    const { user_id } = req.params;

    try {
        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const followers = await User.find({ _id: { $in: user.followers } }, { _id: 1, username: 1 });

        const followerList = followers.map(follower => ({
            user_id: follower._id,
            username: follower.username
        }));

        return res.status(200).json({ followers: followerList });
    } catch (error) {
        console.error("Error occurred while fetching followers:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};



export const getFollowingList = async (req, res) => {
    const { user_id } = req.params;

    try {
        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const following = await User.find({ _id: { $in: user.following } }, { username: 1 });

        return res.status(200).json({ following: following.map(user => user.username) });
    } catch (error) {
        console.error("Error occurred while fetching following:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
